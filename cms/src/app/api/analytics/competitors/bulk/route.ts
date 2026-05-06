/**
 * POST /api/analytics/competitors/bulk
 *
 * Create many tracked-competitor rows at once. Expects:
 *   { domains: string[] }
 *
 * Strips protocol/path/www and lowercases. Skips duplicates already in
 * the collection. Auth-gated to logged-in admin.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

interface BulkBody {
  domains?: string[]
}

function normalizeDomain(input: string): string {
  let d = (input ?? '').trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.split('/')[0]
  d = d.split('?')[0]
  return d
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

  const cleaned = Array.from(
    new Set(
      (body.domains ?? [])
        .map(normalizeDomain)
        .filter((d) => d.length > 0 && d.length < 200 && d.includes('.')),
    ),
  )

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'no valid domains provided' }, { status: 400 })
  }

  const existing = await payload.find({
    collection: 'tracked-competitors',
    limit: 1000,
    depth: 0,
  })
  const existingSet = new Set(existing.docs.map((d: any) => (d.domain ?? '').toLowerCase()))

  const created: Array<{ id: number; domain: string; label: string | null; active: boolean }> = []
  const skipped: string[] = []

  for (const domain of cleaned) {
    if (existingSet.has(domain)) {
      skipped.push(domain)
      continue
    }
    const doc = await payload.create({
      collection: 'tracked-competitors',
      data: {
        domain,
        active: true,
      } as any,
    })
    created.push({
      id: (doc as any).id,
      domain,
      label: null,
      active: true,
    })
  }

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    createdDocs: created,
    skippedDomains: skipped,
  })
}
