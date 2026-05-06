/**
 * GET /api/petition-stats?postSlug=<slug>
 *
 * Public endpoint — returns total signature count and a list of recent
 * display-public signers (first name + last initial + city + relative time).
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)
  const url = new URL(req.url)
  const postSlug = url.searchParams.get('postSlug')?.trim()

  if (!postSlug) {
    return NextResponse.json({ error: 'postSlug required' }, { status: 400, headers })
  }

  try {
    const payload = await getPayload({ config })

    const total = await payload.count({
      collection: 'petition-signatures',
      where: { postSlug: { equals: postSlug } },
    })

    const recent = await payload.find({
      collection: 'petition-signatures',
      where: {
        and: [
          { postSlug: { equals: postSlug } },
          { displayPublic: { equals: true } },
        ],
      },
      sort: '-createdAt',
      limit: 10,
    })

    const signers = recent.docs.map((s: any) => ({
      firstName: s.firstName,
      lastInitial: s.lastName?.[0]?.toUpperCase() ?? '',
      city: s.city,
      createdAt: s.createdAt,
      comment: s.comment || undefined,
    }))

    return NextResponse.json(
      { count: total.totalDocs, signers },
      { status: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=30' } },
    )
  } catch (err: any) {
    console.error('[/api/petition-stats] error', err)
    return NextResponse.json({ error: err?.message ?? 'Error' }, { status: 500, headers })
  }
}
