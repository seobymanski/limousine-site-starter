/**
 * Thin wrapper around the GA4 Data API runReport endpoint. Returns a
 * normalized snapshot shape ready to insert into analytics_ga4_snapshots.
 *
 * Reads GA4_PROPERTY_ID from Worker env (numeric ID, no "properties/" prefix).
 */

import { getAccessToken } from './google-auth'

const GA4_API = 'https://analyticsdata.googleapis.com/v1beta'

interface GA4Response {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>
    metricValues?: Array<{ value?: string }>
  }>
  rowCount?: number
}

export interface GA4DailySnapshot {
  snapshotDate: string
  sessions: number
  users: number
  newUsers: number
  pageviews: number
  bounceRate: number | null
  avgSessionDuration: number | null
  conversions: number
  topPages: Array<{ path: string; pageviews: number }>
  topSources: Array<{ source: string; sessions: number }>
}

function getPropertyId(): string {
  const id =
    (globalThis as any).process?.env?.GA4_PROPERTY_ID ?? process.env.GA4_PROPERTY_ID
  if (!id) throw new Error('GA4_PROPERTY_ID env var is not set.')
  return String(id).replace(/^properties\//, '')
}

async function runReport(propertyId: string, body: unknown): Promise<GA4Response> {
  const token = await getAccessToken()
  const res = await fetch(`${GA4_API}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`GA4 runReport failed (${res.status}): ${errText}`)
  }
  return (await res.json()) as GA4Response
}

function num(s?: string): number {
  const n = parseFloat(s ?? '0')
  return Number.isFinite(n) ? n : 0
}

/**
 * Pull a single day's snapshot. `date` is ISO YYYY-MM-DD. GA4 has a delay of
 * up to 48h on conversion data — for nightly cron, pass yesterday's date.
 */
export async function fetchGA4DailySnapshot(date: string): Promise<GA4DailySnapshot> {
  const propertyId = getPropertyId()
  const dateRange = { startDate: date, endDate: date }

  // Headline metrics in one report
  const headline = await runReport(propertyId, {
    dateRanges: [dateRange],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
    ],
  })

  const headlineRow = headline.rows?.[0]?.metricValues ?? []

  // Top 10 pages by pageviews
  const pagesReport = await runReport(propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: '10',
  })

  const topPages = (pagesReport.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? '',
    pageviews: num(row.metricValues?.[0]?.value),
  }))

  // Top 10 sources by sessions
  const sourcesReport = await runReport(propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: '10',
  })

  const topSources = (sourcesReport.rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value ?? '',
    sessions: num(row.metricValues?.[0]?.value),
  }))

  return {
    snapshotDate: date,
    sessions: num(headlineRow[0]?.value),
    users: num(headlineRow[1]?.value),
    newUsers: num(headlineRow[2]?.value),
    pageviews: num(headlineRow[3]?.value),
    bounceRate: headlineRow[4]?.value ? parseFloat(headlineRow[4].value) : null,
    avgSessionDuration: headlineRow[5]?.value ? parseFloat(headlineRow[5].value) : null,
    conversions: num(headlineRow[6]?.value),
    topPages,
    topSources,
  }
}
