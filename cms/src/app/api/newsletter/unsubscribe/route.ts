/**
 * GET  /api/newsletter/unsubscribe?token=xxx — link from newsletter footer
 * POST /api/newsletter/unsubscribe?token=xxx — RFC 8058 one-click unsubscribe
 *
 * Both flip the subscriber to unsubscribed=true and return a friendly HTML
 * confirmation page. Token-based so the link works even when the recipient
 * isn't logged in to anything.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const SITE_URL = 'https://midtexmod.org'

function html(body: string) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Mid Tex Mod Newsletter</title>
  <style>
    body { margin:0; padding:48px 20px; background:#fafaf5; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif; color:#0f0f0f; }
    .card { max-width:480px; margin:0 auto; background:#fff; border:1px solid #e5e5e0; border-radius:12px; padding:32px; }
    h1 { margin:0 0 12px; font-size:22px; letter-spacing:-0.4px; }
    p { margin:0 0 12px; font-size:15px; line-height:1.55; color:#444; }
    a { color:#0f0f0f; }
    .tag { font-size:11px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:#a16207; margin-bottom:8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="tag">Mid Tex Mod Newsletter</div>
    ${body}
    <p style="margin-top:24px;"><a href="${SITE_URL}">← Back to midtexmod.org</a></p>
  </div>
</body>
</html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

async function unsubscribeByToken(token: string) {
  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'newsletter-subscribers',
    where: { unsubscribeToken: { equals: token } },
    limit: 1,
  })
  if (found.docs.length === 0) {
    return { ok: false, status: 404 as const, message: 'unknown token' }
  }
  const row = found.docs[0] as any
  if (!row.unsubscribed) {
    await payload.update({
      collection: 'newsletter-subscribers',
      id: row.id,
      data: { unsubscribed: true, unsubscribedAt: new Date().toISOString() },
    })
  }
  return { ok: true, email: row.email as string }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) {
    return html(`<h1>Invalid unsubscribe link</h1><p>That link is missing a token. If you got here from a newsletter, please reply to it and let us know.</p>`)
  }
  const r = await unsubscribeByToken(token)
  if (!r.ok) {
    return html(`<h1>Link not recognized</h1><p>This unsubscribe link is no longer valid. If you're still receiving newsletters, please reply to one and we'll remove you manually.</p>`)
  }
  return html(`<h1>You're unsubscribed.</h1><p><strong>${r.email}</strong> won't receive any more newsletters from Mid Tex Mod. Sorry to see you go.</p><p>Changed your mind? You can re-subscribe anytime from the footer of <a href="${SITE_URL}">midtexmod.org</a>.</p>`)
}

// RFC 8058 — Gmail/Apple "one-click unsubscribe" buttons POST here.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 })
  const r = await unsubscribeByToken(token)
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status })
  return NextResponse.json({ ok: true })
}
