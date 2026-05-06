/**
 * Shared logic for fetching + upserting analytics snapshots. Called by both
 * the nightly cron route and the auth-gated manual trigger route, so the two
 * surfaces never drift.
 *
 * Idempotent: if a snapshot already exists for the target date, it's updated
 * in place (not duplicated).
 */

import type { Payload } from 'payload'
import { fetchGA4DailySnapshot } from './ga4-client'
import { fetchGSCDailySnapshot } from './gsc-client'

interface RunResult {
  ga4: { ok: boolean; date?: string; error?: string }
  gsc: { ok: boolean; date?: string; error?: string }
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().split('T')[0]
}

/**
 * D1 stores Payload date fields as plain YYYY-MM-DD strings, but Payload's
 * find({ equals: date }) normalizes the input to an ISO timestamp before
 * querying — they don't match. The `like` operator works against the raw
 * stored string, so we use it to look up the existing row by date prefix.
 */
async function upsertSnapshot(
  payload: Payload,
  collection: 'analytics-ga4-snapshots' | 'analytics-gsc-snapshots',
  date: string,
  data: Record<string, any>,
) {
  const existing = await payload.find({
    collection,
    where: { snapshotDate: { like: date } } as any,
    limit: 1,
  })
  if (existing.docs.length > 0) {
    await payload.update({
      collection,
      id: existing.docs[0].id,
      data: data as any,
    })
  } else {
    await payload.create({ collection, data: data as any })
  }
}

async function upsertGA4Snapshot(payload: Payload, date: string) {
  const snap = await fetchGA4DailySnapshot(date)
  await upsertSnapshot(payload, 'analytics-ga4-snapshots', date, snap)
  return date
}

async function upsertGSCSnapshot(payload: Payload, date: string) {
  const snap = await fetchGSCDailySnapshot(date)
  await upsertSnapshot(payload, 'analytics-gsc-snapshots', date, snap)
  return date
}

/**
 * Pull GA4 + GSC for the target dates (yesterday for GA4, 3 days ago for GSC
 * to account for GSC's reporting delay). Errors in one source don't block
 * the other.
 */
export async function runGoogleSnapshots(payload: Payload): Promise<RunResult> {
  const result: RunResult = {
    ga4: { ok: false },
    gsc: { ok: false },
  }

  const ga4Date = isoDateNDaysAgo(1)
  try {
    await upsertGA4Snapshot(payload, ga4Date)
    result.ga4 = { ok: true, date: ga4Date }
  } catch (err: any) {
    result.ga4 = { ok: false, date: ga4Date, error: err?.message ?? 'unknown' }
    console.error('[analytics-runner] GA4 snapshot failed', err)
  }

  const gscDate = isoDateNDaysAgo(3)
  try {
    await upsertGSCSnapshot(payload, gscDate)
    result.gsc = { ok: true, date: gscDate }
  } catch (err: any) {
    result.gsc = { ok: false, date: gscDate, error: err?.message ?? 'unknown' }
    console.error('[analytics-runner] GSC snapshot failed', err)
  }

  return result
}

/**
 * Backfill mode: pull N days back. Useful for first-time setup so the trend
 * graph isn't empty. Stops on first failure to avoid wasted API quota.
 */
export async function backfillGoogleSnapshots(
  payload: Payload,
  days: number,
): Promise<{ ga4Dates: string[]; gscDates: string[]; error?: string }> {
  const ga4Dates: string[] = []
  const gscDates: string[] = []
  try {
    for (let i = 1; i <= days; i++) {
      ga4Dates.push(await upsertGA4Snapshot(payload, isoDateNDaysAgo(i)))
    }
    for (let i = 3; i < 3 + days; i++) {
      gscDates.push(await upsertGSCSnapshot(payload, isoDateNDaysAgo(i)))
    }
    return { ga4Dates, gscDates }
  } catch (err: any) {
    return { ga4Dates, gscDates, error: err?.message ?? 'unknown' }
  }
}
