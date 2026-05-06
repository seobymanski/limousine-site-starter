/**
 * Thin wrapper around the Google Search Console Search Analytics API.
 * Returns a normalized snapshot shape ready to insert into
 * analytics_gsc_snapshots.
 *
 * Reads GSC_SITE_URL from Worker env. Two formats are valid:
 *   - URL prefix property: "https://www.example.com/" (trailing slash matters)
 *   - Domain property:     "sc-domain:example.com"
 */

import { getAccessToken } from './google-auth'

const GSC_API = 'https://searchconsole.googleapis.com/webmasters/v3'

interface GSCRow {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

interface GSCResponse {
  rows?: GSCRow[]
}

export interface GSCDailySnapshot {
  snapshotDate: string
  impressions: number
  clicks: number
  ctr: number
  avgPosition: number
  topQueries: Array<{ query: string; impressions: number; clicks: number; ctr: number; position: number }>
  topPages: Array<{ page: string; impressions: number; clicks: number; ctr: number; position: number }>
}

function getSiteUrl(): string {
  const url = (globalThis as any).process?.env?.GSC_SITE_URL ?? process.env.GSC_SITE_URL
  if (!url) throw new Error('GSC_SITE_URL env var is not set.')
  return String(url)
}

async function searchAnalyticsQuery(siteUrl: string, body: unknown): Promise<GSCResponse> {
  const token = await getAccessToken()
  const res = await fetch(
    `${GSC_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`GSC searchAnalytics.query failed (${res.status}): ${errText}`)
  }
  return (await res.json()) as GSCResponse
}

/**
 * GSC data has a 2-3 day delay; for nightly cron pass a date 3 days back.
 */
export async function fetchGSCDailySnapshot(date: string): Promise<GSCDailySnapshot> {
  const siteUrl = getSiteUrl()
  const dateRange = { startDate: date, endDate: date }

  // Headline (no dimension = aggregated totals)
  const headline = await searchAnalyticsQuery(siteUrl, { ...dateRange, dimensions: [] })
  const totals = headline.rows?.[0] ?? {}

  // Top 25 queries
  const queriesRes = await searchAnalyticsQuery(siteUrl, {
    ...dateRange,
    dimensions: ['query'],
    rowLimit: 25,
  })
  const topQueries = (queriesRes.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? '',
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }))

  // Top 25 pages
  const pagesRes = await searchAnalyticsQuery(siteUrl, {
    ...dateRange,
    dimensions: ['page'],
    rowLimit: 25,
  })
  const topPages = (pagesRes.rows ?? []).map((row) => ({
    page: row.keys?.[0] ?? '',
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }))

  return {
    snapshotDate: date,
    impressions: totals.impressions ?? 0,
    clicks: totals.clicks ?? 0,
    ctr: totals.ctr ?? 0,
    avgPosition: totals.position ?? 0,
    topQueries,
    topPages,
  }
}
