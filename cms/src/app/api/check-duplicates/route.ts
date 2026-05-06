/**
 * POST /api/check-duplicates
 *
 * Body: { hint: string, postType?: string }
 * Returns:
 *   - { duplicates: false }
 *   - { duplicates: true, matches: [...], angles: [..3..] }
 *
 * Detection is semantic: Claude Haiku reads existing post titles + excerpts
 * and judges whether the user's prompt covers ground that's already been
 * covered, even when the wording is totally different (e.g. "MCM homes in
 * the capital" vs an existing "Modern Houses in Austin" post).
 *
 * Single Claude call returns both the matched post indices and 3 alternative
 * angles in one structured response, keeping latency to ~1-3 sec total.
 */

import { NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload } from 'payload'
import config from '@payload-config'

interface CheckRequest {
  hint?: string
  postType?: string
  category?: string
}

export async function POST(req: Request) {
  try {
    const { hint, postType, category } = (await req.json()) as CheckRequest
    if (!hint || hint.trim().length < 5) {
      return NextResponse.json({ duplicates: false })
    }

    // Events recur annually by editorial convention (MCM Home Tour 2026 →
    // 2027), so flagging same-name events as duplicates would be wrong.
    if (category === 'events') {
      return NextResponse.json({ duplicates: false })
    }

    const payload = await getPayload({ config })

    // Resolve API key (Worker secret → process.env). Set with:
    //   cd cms && npx wrangler secret put ANTHROPIC_API_KEY
    let apiKey: string | undefined
    try {
      const { env } = getCloudflareContext()
      apiKey = (env as any)?.ANTHROPIC_API_KEY
    } catch {}
    if (!apiKey) apiKey = process.env.ANTHROPIC_API_KEY

    // Without an API key we can't do the semantic check; fail open.
    if (!apiKey) return NextResponse.json({ duplicates: false })

    // Scope to same category when one is provided, so newsletter prompts
    // only compare against existing newsletters, building spotlights against
    // building spotlights, etc. Cuts false positives and shrinks the context
    // sent to Claude.
    const where: Record<string, unknown> = { status: { equals: 'published' } }
    if (category) where.category = { equals: category }

    const posts = await payload.find({
      collection: 'blog-posts',
      where,
      sort: '-publishedDate',
      limit: 100,
      depth: 0,
      select: { title: true, slug: true, category: true, excerpt: true },
    })

    if (posts.docs.length === 0) {
      return NextResponse.json({ duplicates: false })
    }

    // Number each post so Claude can refer back by index.
    const postList = posts.docs
      .map((p: any, i: number) => {
        const excerpt = (p.excerpt ?? '').slice(0, 220).replace(/\s+/g, ' ').trim()
        return `[${i}] ${p.title}${excerpt ? ` — ${excerpt}` : ''}`
      })
      .join('\n')

    const prompt = `A content editor wants to write a new ${postType || 'post'} with this topic:

"${hint.trim()}"

Here are the existing published posts on the site:

${postList}

Decide whether the editor's topic substantially overlaps with any existing post. Substantial overlap means the same subject, angle, or core argument — even when the wording differs. Mere shared keywords (e.g. both mention "Austin") are NOT overlap.

Respond with ONLY a JSON object, no prose, in this exact shape:

{
  "duplicates": true | false,
  "matchedIndices": [<integers from the post list above>],
  "angles": ["<angle 1>", "<angle 2>", "<angle 3>"]
}

Rules:
- If "duplicates" is false: matchedIndices and angles must be empty arrays.
- If "duplicates" is true: include 1-5 matchedIndices and exactly 3 angles.
- Each angle must be ONE sentence the editor could paste back as a generation prompt — specific, distinct from the existing posts, and a genuine new angle (not a rephrase).`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiRes.ok) {
      console.warn('[/api/check-duplicates] anthropic error', aiRes.status)
      return NextResponse.json({ duplicates: false })
    }

    const data = (await aiRes.json()) as any
    const text = data.content?.find((b: any) => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ duplicates: false })

    let parsed: { duplicates?: boolean; matchedIndices?: unknown; angles?: unknown }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ duplicates: false })
    }

    if (!parsed.duplicates) return NextResponse.json({ duplicates: false })

    const indices = Array.isArray(parsed.matchedIndices)
      ? parsed.matchedIndices.filter((n): n is number => Number.isInteger(n))
      : []
    const matches = indices
      .map((i) => posts.docs[i])
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
      }))

    const angles = Array.isArray(parsed.angles)
      ? parsed.angles.filter((s: unknown): s is string => typeof s === 'string').slice(0, 3)
      : []

    if (matches.length === 0 || angles.length === 0) {
      return NextResponse.json({ duplicates: false })
    }

    return NextResponse.json({ duplicates: true, matches, angles })
  } catch (err) {
    console.error('[/api/check-duplicates] error', err)
    // Fail-open — never block generation on a duplicate-check error.
    return NextResponse.json({ duplicates: false })
  }
}
