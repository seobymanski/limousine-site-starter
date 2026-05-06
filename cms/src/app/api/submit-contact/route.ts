/**
 * POST /api/submit-contact
 *
 * Body: { name, email, phone?, subject?, message }
 * Stores a contact form submission in the ContactSubmissions collection.
 * CORS-open so the public Astro site can POST directly.
 *
 * The Astro /api/contact route also sends the email via Resend — this
 * endpoint just provides a durable record in the CMS for browsing/replying.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const ALLOWED_ORIGINS = [
  'https://example.com',
  'https://www.example.com',
  'https://CLIENT-site.workers.dev',
  'http://localhost:4321',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const headers = corsHeaders(req.headers.get('origin'))

  try {
    const body = (await req.json()) as Record<string, unknown>

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined
    const subject = typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim()
      : 'General Inquiry'
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400, headers },
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400, headers })
    }

    const payload = await getPayload({ config })
    await payload.create({
      collection: 'contact-submissions',
      data: { name, email, phone, subject, message, handled: false },
    })

    return NextResponse.json({ ok: true }, { status: 201, headers })
  } catch (err: any) {
    console.error('[/api/submit-contact] error', err)
    return NextResponse.json(
      { error: err?.message ?? 'Could not record submission.' },
      { status: 500, headers },
    )
  }
}
