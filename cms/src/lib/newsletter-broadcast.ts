/**
 * Render a published newsletter into a digest-style email and send it to
 * every confirmed, non-unsubscribed subscriber. Triggered from the
 * BlogPosts afterChange hook when a newsletter transitions to published.
 *
 * Design choice: we send a "click to read" digest, not the full article
 * body. Lexical → HTML email is fragile (style stripping, dark mode, image
 * proxies), and the digest format pushes traffic back to midtexmod.org
 * which is better for SEO and analytics.
 */

import type { Payload } from 'payload'
import { sendEmailsBatch, type BatchEmailItem } from './resend'

const SITE_URL = 'https://www.midtexmod.org'
const CMS_URL = 'https://cms.midtexmod.org'
const LOGO_URL = 'https://www.midtexmod.org/images/mtm-logo.jpg'

interface NewsletterPostLite {
  id: number | string
  title?: string
  slug?: string
  excerpt?: string
  heroImage?: any
  publishedDate?: string | null
}

function renderHtml(post: NewsletterPostLite, unsubscribeUrl: string): string {
  const url = `${SITE_URL}/mid-texas-modern/newsletter/${post.slug ?? ''}`
  const safeTitle = (post.title ?? 'New from Mid Tex Mod').replace(/</g, '&lt;')
  const safeExcerpt = (post.excerpt ?? 'A new edition of the Mid Tex Mod newsletter is live.').replace(/</g, '&lt;')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#fafaf5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e0;">
        <tr><td align="center" style="padding:28px 32px 8px;background:#fafaf5;border-bottom:1px solid #f0f0ec;">
          <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;">
            <img src="${LOGO_URL}" alt="Mid Tex Mod" width="120" height="120" style="display:block;width:120px;height:auto;border:0;outline:none;text-decoration:none;" />
          </a>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#a16207;">Mid Tex Mod Newsletter</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.5px;color:#0f0f0f;">${safeTitle}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#444;">${safeExcerpt}</p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <a href="${url}" style="display:inline-block;background:#0f0f0f;color:#FFC700;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;letter-spacing:0.02em;">Read the full newsletter</a>
        </td></tr>
        <tr><td style="padding:18px 32px 24px;border-top:1px solid #f0f0ec;background:#fbfbf6;">
          <p style="margin:0 0 6px;font-size:11px;color:#888;line-height:1.5;">
            You're receiving this because you subscribed to the Mid Tex Mod newsletter at midtexmod.org.
          </p>
          <p style="margin:0;font-size:11px;color:#888;line-height:1.5;">
            <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a>
            &nbsp;&middot;&nbsp;
            <a href="${SITE_URL}" style="color:#888;text-decoration:underline;">midtexmod.org</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function renderText(post: NewsletterPostLite, unsubscribeUrl: string): string {
  const url = `${SITE_URL}/mid-texas-modern/newsletter/${post.slug ?? ''}`
  return [
    `Mid Tex Mod Newsletter`,
    ``,
    post.title ?? 'New from Mid Tex Mod',
    ``,
    post.excerpt ?? 'A new edition of the Mid Tex Mod newsletter is live.',
    ``,
    `Read the full newsletter: ${url}`,
    ``,
    `You're receiving this because you subscribed at midtexmod.org.`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n')
}

export interface BroadcastResult {
  ok: boolean
  sent: number
  skipped: number
  batches: number
  errors: string[]
}

export async function broadcastNewsletter(
  payload: Payload,
  post: NewsletterPostLite,
): Promise<BroadcastResult> {
  const result: BroadcastResult = { ok: true, sent: 0, skipped: 0, batches: 0, errors: [] }

  // Pull every active subscriber. 1000-cap is intentional — once the list
  // grows past that we'll need to paginate, but at that scale we should
  // also rethink synchronous broadcasting.
  const subs = await payload.find({
    collection: 'newsletter-subscribers',
    where: {
      and: [
        { unsubscribed: { equals: false } },
        { confirmed: { equals: true } },
      ],
    },
    limit: 1000,
    depth: 0,
  })

  const subject = post.title
    ? `${post.title} | Mid Tex Mod Newsletter`
    : 'New from the Mid Tex Mod Newsletter'

  // Resend batch endpoint caps at 100 per call.
  const all = subs.docs as Array<{ email: string; unsubscribeToken: string }>
  if (all.length === 0) return result

  for (let i = 0; i < all.length; i += 100) {
    const chunk = all.slice(i, i + 100)
    const items: BatchEmailItem[] = chunk.map((s) => {
      const unsubUrl = `${CMS_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(s.unsubscribeToken)}`
      return {
        to: s.email,
        subject,
        html: renderHtml(post, unsubUrl),
        text: renderText(post, unsubUrl),
        listUnsubscribeUrl: unsubUrl,
      }
    })
    const r = await sendEmailsBatch(items)
    result.batches++
    if (r.ok) {
      result.sent += chunk.length
    } else {
      result.skipped += chunk.length
      result.errors.push(r.error ?? 'unknown')
      result.ok = false
    }
  }

  return result
}
