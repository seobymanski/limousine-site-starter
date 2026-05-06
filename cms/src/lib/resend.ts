/**
 * Thin wrapper around Resend's HTTP API. The contact form already uses
 * Resend from the Astro frontend with the same RESEND_API_KEY secret;
 * this module is the CMS-side equivalent so newsletter signups + broadcasts
 * can send mail without leaving the Worker.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare'

const RESEND_API = 'https://api.resend.com'

const FROM_DEFAULT = 'Mid Tex Mod <noreply@midtexmod.org>'

function getKey(): string | undefined {
  // On Cloudflare Workers, secrets live on the Cloudflare context — not on
  // process.env. Try the binding path first, then fall back to env vars
  // for local dev. Same pattern as llm-mentions / google-auth.
  try {
    const { env } = getCloudflareContext()
    const v = (env as any)?.RESEND_API_KEY
    if (v) return v
  } catch {}
  return (
    (globalThis as any).process?.env?.RESEND_API_KEY ??
    (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : undefined)
  )
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  /** Optional: per-recipient one-click unsubscribe header (RFC 8058). */
  listUnsubscribeUrl?: string
  /** Optional: override the From line. */
  from?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = getKey()
  if (!key) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const headers: Record<string, string> = {}
  if (input.listUnsubscribeUrl) {
    // Both headers together unlock the Gmail/Apple "Unsubscribe" UI.
    headers['List-Unsubscribe'] = `<${input.listUnsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }

  try {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: input.from ?? FROM_DEFAULT,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `Resend ${res.status}: ${errText}` }
    }
    const data = (await res.json()) as { id?: string }
    return { ok: true, id: data.id }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'unknown' }
  }
}

export interface BatchEmailItem {
  to: string
  subject: string
  html: string
  text?: string
  listUnsubscribeUrl?: string
  from?: string
}

/**
 * Send up to 100 emails in one Resend API call. Each item can have its own
 * subject, body, and List-Unsubscribe URL — perfect for newsletter blasts
 * with per-recipient unsubscribe links.
 */
export async function sendEmailsBatch(items: BatchEmailItem[]): Promise<SendEmailResult> {
  const key = getKey()
  if (!key) return { ok: false, error: 'RESEND_API_KEY not configured' }
  if (items.length === 0) return { ok: true }
  if (items.length > 100) {
    return { ok: false, error: `Resend batch caps at 100 per call, got ${items.length}` }
  }

  const payload = items.map((it) => {
    const headers: Record<string, string> = {}
    if (it.listUnsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${it.listUnsubscribeUrl}>`
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }
    return {
      from: it.from ?? FROM_DEFAULT,
      to: [it.to],
      subject: it.subject,
      html: it.html,
      text: it.text,
      headers,
    }
  })

  try {
    const res = await fetch(`${RESEND_API}/emails/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `Resend batch ${res.status}: ${errText}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'unknown' }
  }
}
