/**
 * POST /api/analytics/run/dataforseo
 *
 * Manual trigger for the weekly DataForSEO snapshot. Auth-gated to any
 * logged-in admin user, so editors can refresh on demand without needing
 * the CRON_SECRET.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runDataForSeoSnapshot } from '@/lib/dataforseo-runner'

export async function POST(_req: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runDataForSeoSnapshot(payload)
  return NextResponse.json({ mode: 'manual', ...result })
}
