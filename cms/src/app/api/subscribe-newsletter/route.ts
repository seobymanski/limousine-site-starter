/**
 * POST /api/subscribe-newsletter
 *
 * Public endpoint hit by the NewsletterSignup form on midtexmod.org. Stores
 * the email in newsletter-subscribers (idempotent — re-submitting just
 * resurrects an unsubscribed row). Sends a one-time welcome email so the
 * subscriber knows it worked.
 *
 * Body: { email: string, source?: string }
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sendEmail } from '@/lib/resend'

const SITE_URL = 'https://www.midtexmod.org'
const CMS_URL = 'https://cms.midtexmod.org'
const LOGO_URL = 'https://www.midtexmod.org/images/mtm-logo.jpg'

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function newToken(): string {
  // 32 hex chars (~128 bits). Workers expose crypto.randomUUID + getRandomValues.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function renderWelcomeHtml(unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#fafaf5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;border:1px solid #e5e5e0;overflow:hidden;">
        <tr><td align="center" style="padding:28px 32px 8px;background:#fafaf5;border-bottom:1px solid #f0f0ec;">
          <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
            <img src="${LOGO_URL}" alt="Mid Tex Mod" width="120" height="120" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;" />
          </a>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#a16207;">Welcome to Mid Tex Mod</div>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:#0f0f0f;">You're on the list.</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#444;">
            Thanks for subscribing. You'll get the next Mid Tex Mod newsletter the moment it's published. Expect coverage of preservation efforts, upcoming events, and mid-century modern architecture across Central Texas.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#444;">
            In the meantime, browse the <a href="${SITE_URL}/mid-texas-modern/newsletter" style="color:#0f0f0f;">past newsletter archive</a>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px 24px;border-top:1px solid #f0f0ec;background:#fbfbf6;">
          <p style="margin:0;font-size:11px;color:#888;line-height:1.5;">
            Didn't sign up? <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe instantly</a>, no questions asked.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function POST(req: Request) {
  let body: { email?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const source = (body.source ?? '').trim() || undefined

  if (!email || !EMAIL_RX.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  // Check for existing row first — re-subscribe path resurrects unsubscribed.
  const existing = await payload.find({
    collection: 'newsletter-subscribers',
    where: { email: { equals: email } },
    limit: 1,
  })

  let token: string
  if (existing.docs.length > 0) {
    const row = existing.docs[0] as any
    token = row.unsubscribeToken
    if (row.unsubscribed) {
      await payload.update({
        collection: 'newsletter-subscribers',
        id: row.id,
        data: { unsubscribed: false, unsubscribedAt: null, source: source ?? row.source },
      })
    } else if (source && source !== row.source) {
      await payload.update({
        collection: 'newsletter-subscribers',
        id: row.id,
        data: { source },
      })
    }
  } else {
    token = newToken()
    await payload.create({
      collection: 'newsletter-subscribers',
      data: { email, source, confirmed: true, unsubscribed: false, unsubscribeToken: token },
    })
  }

  // Welcome email — non-fatal if Resend fails.
  const unsubUrl = `${CMS_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
  const r = await sendEmail({
    to: email,
    subject: `Welcome to the Mid Tex Mod newsletter`,
    html: renderWelcomeHtml(unsubUrl),
    listUnsubscribeUrl: unsubUrl,
  })
  if (!r.ok) {
    console.warn('[/api/subscribe-newsletter] welcome email failed:', r.error)
  }

  return NextResponse.json({ ok: true })
}

// Preflight for the public Astro form.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    },
  })
}
