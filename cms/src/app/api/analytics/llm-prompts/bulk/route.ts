/**
 * POST /api/analytics/llm-prompts/bulk
 *
 * Bulk-create prompts. Body: { prompts: string[] }. Auth-gated.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

interface BulkBody {
  prompts?: string[]
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
      (body.prompts ?? [])
        .map((p) => (p ?? '').trim())
        .filter((p) => p.length >= 5 && p.length < 1000),
    ),
  )

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'no valid prompts provided' }, { status: 400 })
  }

  const existing = await payload.find({
    collection: 'llm-target-prompts',
    limit: 1000,
    depth: 0,
  })
  const existingSet = new Set(
    (existing.docs as any[]).map((d) => (d.prompt ?? '').toLowerCase().trim()),
  )

  const created: Array<{ id: number; prompt: string; description: string | null; active: boolean }> = []
  const skipped: string[] = []

  for (const prompt of cleaned) {
    if (existingSet.has(prompt.toLowerCase())) {
      skipped.push(prompt)
      continue
    }
    const doc = await payload.create({
      collection: 'llm-target-prompts',
      data: { prompt, active: true } as any,
    })
    created.push({
      id: (doc as any).id,
      prompt,
      description: null,
      active: true,
    })
  }

  return NextResponse.json({
    created: created.length,
    skipped: skipped.length,
    createdDocs: created,
    skippedPrompts: skipped,
  })
}
