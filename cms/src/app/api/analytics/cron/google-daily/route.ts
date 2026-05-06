/**
 * GET /api/analytics/cron/google-daily
 *
 * Hit by an external scheduler (cron-job.org, GitHub Actions, etc.) once
 * per night. Pulls yesterday's GA4 metrics + GSC's 3-day-lagged metrics
 * into D1.
 *
 * Gated by the CRON_SECRET Worker secret to prevent random callers from
 * triggering API quota burn. The secret can be passed as the ?secret=...
 * query param or the x-cron-secret header.
 *
 * Also accepts ?backfill=N to seed the first N days of history (manual use).
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { runGoogleSnapshots, backfillGoogleSnapshots } from '@/lib/analytics-runner'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const provided = url.searchParams.get('secret') ?? req.headers.get('x-cron-secret')
  const expected =
    (globalThis as any).process?.env?.CRON_SECRET ?? process.env.CRON_SECRET
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const backfillParam = url.searchParams.get('backfill')

  if (backfillParam) {
    const days = Math.min(Math.max(parseInt(backfillParam, 10) || 0, 1), 30)
    const result = await backfillGoogleSnapshots(payload, days)
    return NextResponse.json({ mode: 'backfill', days, ...result })
  }

  const result = await runGoogleSnapshots(payload)
  return NextResponse.json({ mode: 'daily', ...result })
}
