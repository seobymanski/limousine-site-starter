/**
 * POST /api/analytics/run/llm-mentions
 *
 * Manual trigger for the same logic the weekly cron runs. Auth-gated to
 * any logged-in admin so editors can refresh on demand.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runLLMMentionsSnapshot } from '@/lib/llm-mentions'

export async function POST(_req: Request) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await runLLMMentionsSnapshot(payload)
  return NextResponse.json({ mode: 'manual', ...result })
}
