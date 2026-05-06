import type { APIRoute } from 'astro';

export const prerender = false;

const CMS_URL =
  ((globalThis as any).process?.env?.PAYLOAD_CMS_URL as string | undefined) ??
  ((import.meta as any).env?.PAYLOAD_CMS_URL as string | undefined) ??
  'https://CLIENT-cms.workers.dev';

/**
 * Save a durable record of the contact submission to the CMS so admins can
 * browse, filter, and mark as handled. Failure is non-fatal — the email
 * (Resend) is still the primary delivery channel.
 */
async function saveToCMS(data: { name: string; email: string; phone?: string; subject: string; message: string }) {
  try {
    const res = await fetch(`${CMS_URL.replace(/\/$/, '')}/api/submit-contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.warn('[api/contact] CMS save failed', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[api/contact] CMS save threw', err);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get('name')?.toString() || '';
  const email = formData.get('email')?.toString() || '';
  const phone = formData.get('phone')?.toString() || '';
  const subject = formData.get('subject')?.toString() || 'General Inquiry';
  const message = formData.get('message')?.toString() || '';
  const honeypot = formData.get('_honey')?.toString() || '';

  // Honeypot check
  if (honeypot) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // Validate
  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ error: 'Please fill in all required fields.' }),
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: 'Please enter a valid email address.' }),
      { status: 400 }
    );
  }

  try {
    // Save the durable record first — Resend can fail, the CMS log shouldn't.
    await saveToCMS({ name, email, phone, subject, message });

    // Cloudflare Worker secrets are runtime, not build-time. import.meta.env
    // only exposes build-time vars (and would bake the key into the public
    // bundle if it did surface them). Mirror the pattern used elsewhere.
    const RESEND_API_KEY =
      (globalThis as any).process?.env?.RESEND_API_KEY ??
      (import.meta as any).env?.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      // Fallback: log the message if no API key configured
      console.log('Contact form submission:', { name, email, phone, subject, message });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: '[BRAND] <reservations@example.com>',
        to: ['reservations@example.com'],
        subject: `[Website] ${subject}: ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p>${message.replace(/\n/g, '<br />')}</p>
        `,
        reply_to: email,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send message. Please try again.' }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('Contact form error:', err);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again later.' }),
      { status: 500 }
    );
  }
};
