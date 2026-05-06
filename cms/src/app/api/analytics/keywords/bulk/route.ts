/**
 * POST /api/analytics/keywords/bulk
 *
 * Create many tracked-keyword rows at once. Expects a body like:
 *   { keywords: string[], location?: string }
 *
 * Skips duplicates (same keyword + location already exists).
 * Auth-gated to logged-in admin.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_LOCATION } from '@/lib/analytics-config'

interface BulkBody {
  keywords?: string[]
  location?: string
}

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: BulkBody = {}
  try {
    body = (await req.json()) as BulkBody
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const location = (body.location ?? DEFAULT_LOCATION).trim() || DEFAULT_LOCATION
  const cleaned = Array.from(
    new Set(
      (body.keywords ?? [])
        .map((k) => (k ?? '').trim())
        .filter((k) => k.length > 0 && k.length < 200),
    ),
  )

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'no keywords provided' }, { status: 400 })
  }

  // Pull existing keywords once to skip duplicates without a query per row
  const existing = await payload.find({
    collection: 'tracked-keywords',
    limit: 1000,
    depth: 0,
  })
  const existingSet = new Set(
    existing.docs.map((d: any) => `${(d.keyword ?? '').toLowerCase()}|${(d.location ?? '').toLowerCase()}`),
  )

  const created: Array<{ id: number; keyword: string; location: string; active: boolean }> = []
  const skipped: string[] = []

  for (const keyword of cleaned) {
    const dupeKey = `${keyword.toLowerCase()}|${location.toLowerCase()}`
    if (existingSet.has(dupeKey)) {
      skipped.push(keyword)
      continue
    }
    const doc = await payload.create({
      collection: 'tracked-keywords',
      data: {
        keyword,
        location,
        searchEngine: 'google',
        active: true,
      } as any,
    })
    created.push({
      id: (doc as any).id,
      keyword,
      location,
      active: true,
    })
  }

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    createdDocs: created,
    skippedKeywords: skipped,
  })
}
