/**
 * POST /api/generate-image
 *
 * Generate a brand-consistent hero image for an existing blog-post via
 * Google's Gemini 2.5 Flash Image (Nano Banana), upload to R2 via Payload's
 * media collection, attach as featuredImage + bannerImage on the post.
 *
 * Body: { postId: number, promptOverride?: string }
 * Returns: { ok: true, mediaId, filename, promptUsed }
 *
 * Auth: requires Payload admin session (cookie or JWT).
 *
 * API key resolution (in order): Cloudflare Worker secret → process.env.
 * Set with: cd cms && npx wrangler secret put GEMINI_API_KEY
 */

import { NextResponse } from 'next/server'
import { getPayload, type PayloadRequest } from 'payload'
import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { headers as nextHeaders } from 'next/headers'

// Default to the GA model name. Override at runtime via the GEMINI_MODEL
// Worker secret if Google renames the endpoint:
//   cd cms && npx wrangler secret put GEMINI_MODEL
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-image'

function geminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

const BRAND_STYLE = `Cinematic editorial photography in the style of luxury automotive magazines (Robb Report, Aficionado). Muted palette: deep black, ivory cream, warm gold (#c9a96e) accents. Late golden-hour or twilight lighting, atmospheric, shallow depth of field, fine grain. Wide 16:9 cinematic framing with negative space in the lower-left for text overlay. Premium, understated, classic — never flashy or commercial. No text, captions, or logos in the image.`

interface GenImageRequest {
  postId: number | string
  /** 'hero' attaches as featured + banner. 'gallery' appends to galleryImages. */
  slot?: 'hero' | 'gallery'
  /** Variant index 0..N — drives prompt rotation for gallery slot. */
  variant?: number
  /** Optional prompt — if omitted, a slot-aware default is built from the post. */
  promptOverride?: string
  /** Optional caption for gallery slot. */
  caption?: string
}

function buildPrompt(post: any, slot: 'hero' | 'gallery' = 'hero', variant = 0): string {
  // Variant rotation for gallery — keeps each gallery image distinct.
  const galleryFlavors = [
    'Tight detail of supple black leather rear-cabin upholstery, brushed-aluminum trim, ambient warm reading light. Hands of a uniformed chauffeur visible loading a leather valise. Shallow focus, late-evening interior tones.',
    'Medium 3/4 shot of an open vehicle door with a uniformed chauffeur extending a hand, dramatic side light, breath fog in cool air. Wet pavement reflecting warm runway/streetlights.',
    'Atmospheric ground-level wide shot of taillights and reflections on wet asphalt, the silhouette of a Sprinter pulling away into a runway-light haze.',
  ]
  if (slot === 'gallery') {
    const flavor = galleryFlavors[variant % galleryFlavors.length]
    const ctx =
      post.category === 'airport-page'
        ? `Set at ${post.title.replace(/^Private Jet Transfer at /, '').replace(/ \([A-Z]{3,4}\)$/, '').trim()}.`
        : post.category === 'location-page'
          ? `Set in ${post.title.replace(/^Private Jet Transfer in /, '').split(',')[0].trim()}.`
          : ''
    return `${BRAND_STYLE}\n\nScene: ${flavor} ${ctx} Composition leaves the lower-left third uncluttered for caption overlay.`
  }

  const category = post.category
  if (category === 'airport-page') {
    const aps = post.airportSections
    const fbos = Array.isArray(aps?.fboOperators)
      ? aps.fboOperators
          .map((f: any) => f?.name)
          .filter((n: any) => typeof n === 'string' && n.length > 0)
          .slice(0, 2)
          .join(' or ')
      : ''
    const fboLine = fbos ? `parked on the ${fbos} ramp` : 'parked on a private jet ramp'
    const airportFromTitle = post.title
      .replace(/^Private Jet Transfer at /, '')
      .replace(/ \([A-Z]{3,4}\)$/, '')
      .trim()
    return `${BRAND_STYLE}\n\nScene: A black Mercedes Sprinter or Cadillac Escalade ${fboLine} at ${airportFromTitle}. A sleek private jet (Gulfstream or similar) sits in soft-focus background. Twilight sky with dramatic warm clouds. Runway lights and ambient FBO ramp lights catch the wet asphalt. Composition leaves the lower-left third uncluttered.`
  }
  if (category === 'location-page') {
    const cityFromTitle = post.title
      .replace(/^Private Jet Transfer in /, '')
      .split(',')[0]
      .trim()
    return `${BRAND_STYLE}\n\nScene: A black luxury Mercedes sedan or Sprinter on an iconic ${cityFromTitle} street or vista at golden hour. A recognizable ${cityFromTitle} skyline, landmark, or geographic feature sits in soft-focus background. Wet asphalt or stone catches reflected light. Composition leaves the lower-left third uncluttered.`
  }
  // blog/news fallback
  return `${BRAND_STYLE}\n\nScene: An elegant detail of a luxury black vehicle interior or exterior — soft leather, brushed metal trim, ambient warm light. Editorial framing.`
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<{ data: Buffer; mimetype: string }> {
  const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini ${model} ${res.status}: ${text.slice(0, 400)}`)
  }
  const data = (await res.json()) as any
  const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData)
  if (!part?.inlineData?.data) {
    throw new Error('Gemini returned no image data')
  }
  return {
    data: Buffer.from(part.inlineData.data, 'base64'),
    mimetype: part.inlineData.mimeType || 'image/png',
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenImageRequest
    if (body?.postId === undefined || body?.postId === null) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Auth — admin session required
    const hdrs = await nextHeaders()
    const { user } = await payload.auth(
      { headers: hdrs as any } as { headers: PayloadRequest['headers'] } as any,
    )
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized — log into the admin first.' }, { status: 401 })
    }

    // API key + model resolution (Worker secret → process.env)
    let apiKey: string | undefined
    let model: string = DEFAULT_GEMINI_MODEL
    try {
      const { env } = getCloudflareContext()
      const e = env as any
      apiKey = e?.GEMINI_API_KEY
      if (typeof e?.GEMINI_MODEL === 'string' && e.GEMINI_MODEL) model = e.GEMINI_MODEL
    } catch {}
    if (!apiKey) apiKey = process.env.GEMINI_API_KEY
    if (process.env.GEMINI_MODEL) model = process.env.GEMINI_MODEL
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Run: cd cms && npx wrangler secret put GEMINI_API_KEY' },
        { status: 500 },
      )
    }

    // Load the post
    const post = await payload.findByID({
      collection: 'blog-posts',
      id: body.postId as any,
      depth: 1,
    })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const slot = body.slot === 'gallery' ? 'gallery' : 'hero'
    const variant = typeof body.variant === 'number' ? body.variant : 0
    const prompt = body.promptOverride || buildPrompt(post, slot, variant)

    // Generate
    const { data: imageBuffer, mimetype } = await callGemini(apiKey, model, prompt)

    // Upload via Payload media
    const ext = mimetype === 'image/jpeg' ? 'jpg' : mimetype === 'image/webp' ? 'webp' : 'png'
    const slug = (post as any).slug || `post-${post.id}`
    const slotSuffix = slot === 'gallery' ? `gallery-${variant + 1}` : 'hero'
    const filename = `${slug}-${slotSuffix}.${ext}`
    const altText = `${post.title} — [BRAND]`

    const media = await payload.create({
      collection: 'media',
      data: { alt: altText },
      file: {
        data: imageBuffer,
        mimetype,
        name: filename,
        size: imageBuffer.length,
      },
    })

    // Attach via raw D1 — Payload's update() pathway is currently broken on
    // this DB (an upsert-style INSERT fails without surfacing the SQLite
    // cause). Raw SQL sidesteps the issue.
    try {
      const { env } = getCloudflareContext()
      const d1 = (env as any)?.D1
      if (!d1?.prepare) {
        throw new Error('D1 binding unavailable')
      }
      if (slot === 'hero') {
        await d1
          .prepare('UPDATE blog_posts SET featured_image_id = ?, banner_image_id = ? WHERE id = ?')
          .bind(media.id, media.id, post.id)
          .run()
      } else {
        // Find next _order for the gallery on this post
        const orderRow = await d1
          .prepare('SELECT COALESCE(MAX(_order), 0) AS max_order FROM blog_posts_gallery_images WHERE _parent_id = ?')
          .bind(post.id)
          .first()
        const nextOrder = ((orderRow as any)?.max_order ?? 0) + 1
        const rowId = `${post.id}-gallery-${variant + 1}-${Date.now().toString(36)}`
        const cap = body.caption || ''
        await d1
          .prepare(
            'INSERT INTO blog_posts_gallery_images (_order, _parent_id, id, image_id, caption) VALUES (?, ?, ?, ?, ?)',
          )
          .bind(nextOrder, post.id, rowId, media.id, cap)
          .run()
      }
    } catch (attachErr: any) {
      console.error('[/api/generate-image] failed to attach image to post', attachErr)
      // Don't fail the whole request — the media is uploaded; an editor can
      // attach it manually if needed.
    }

    return NextResponse.json({
      ok: true,
      mediaId: media.id,
      filename,
      slot,
      variant,
      promptUsed: prompt,
    })
  } catch (err: any) {
    console.error('[/api/generate-image] error', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to generate image' },
      { status: 500 },
    )
  }
}
