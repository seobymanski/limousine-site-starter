/**
 * GET /api/analytics/cron/dataforseo-weekly
 *
 * Hit by an external scheduler once per week. Pulls our domain's ranked
 * keyword profile + each tracked competitor's profile from DataForSEO into D1.
 *
 * Gated by the CRON_SECRET Worker secret.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runDataForSeoSnapshot } from '@/lib/dataforseo-runner'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const provided = url.searchParams.get('secret') ?? req.headers.get('x-cron-secret')
  const expected =
    (globalThis as any).process?.env?.CRON_SECRET ?? process.env.CRON_SECRET
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const result = await runDataForSeoSnapshot(payload)
  return NextResponse.json({ mode: 'weekly', ...result })
}
