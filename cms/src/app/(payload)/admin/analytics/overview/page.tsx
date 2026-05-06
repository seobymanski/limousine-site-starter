import React from 'react'
import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { Gutter } from '@payloadcms/ui'
import { getPayload } from 'payload'
import config from '@payload-config'
import TrendLineChart from '@/components/charts/TrendLineChart'
import TrafficSourcesPie from '@/components/charts/TrafficSourcesPie'
import EmptyAnalyticsState from '@/components/analytics/EmptyAnalyticsState'
import GapAnalysis from '@/components/analytics/GapAnalysis'
import { OUR_DOMAIN, OUR_BRAND_DISPLAY } from '@/lib/analytics-config'

export const dynamic = 'force-dynamic'

interface QueryRow {
  query: string
  impressions: number
  clicks: number
  ctr: number
  position: number
}
interface PageRow {
  page?: string
  path?: string
  impressions?: number
  clicks?: number
  pageviews?: number
}
interface SourceRow {
  source: string
  sessions: number
}

const cellStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 12,
  color: 'var(--theme-elevation-800, #333)',
  borderBottom: '1px solid var(--theme-elevation-100, #e5e5e0)',
}

const headerCellStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--theme-elevation-500, #888)',
  textAlign: 'left',
  borderBottom: '1px solid var(--theme-elevation-200, #ddd)',
}

const cardStyle: React.CSSProperties = {
  padding: '20px 22px',
  border: '1px solid var(--theme-elevation-100, #e5e5e0)',
  borderRadius: 8,
  background: 'var(--theme-bg, #fdfdf7)',
}

function sumWindow<T extends Record<string, any>>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0)
}

/**
 * D1 stores Payload `json` columns as TEXT. Some access paths (notably the
 * SQL adapter on Workers) return that as a string instead of a parsed
 * value. Defensive parser so the gap-analysis matrix renders regardless.
 */
function parseKeywordArray(val: unknown): Array<{ keyword: string; position: number; searchVolume: number; url?: string }> {
  if (Array.isArray(val)) return val as any
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  // Some serializers return JSON arrays as object-with-numeric-keys.
  if (val && typeof val === 'object') {
    const values = Object.values(val as Record<string, any>)
    return values.filter((v) => v && typeof v === 'object' && 'keyword' in v) as any
  }
  return []
}

function delta(current: number, prior: number): { pct: number; positive: boolean } {
  if (prior === 0) return { pct: 0, positive: true }
  const pct = ((current - prior) / prior) * 100
  return { pct, positive: pct >= 0 }
}

function fmt(n: number): string {
  return n.toLocaleString()
}

/**
 * Substring check for "is this URL one of ours" — used to flag and sort our
 * own domain in citation lists. Not exact-match; the goal is to highlight
 * any cited URL whose host contains OUR_DOMAIN.
 */
function isOurUrl(u: string): boolean {
  return u.toLowerCase().includes(OUR_DOMAIN.toLowerCase())
}

interface KPIProps {
  label: string
  value: string
  subValue?: string
  delta?: { pct: number; positive: boolean }
  higherIsBetter?: boolean
}

const KPI: React.FC<KPIProps> = ({ label, value, subValue, delta, higherIsBetter = true }) => {
  const goodColor = '#16a34a'
  const badColor = '#dc2626'
  const isGood = delta ? (higherIsBetter ? delta.positive : !delta.positive) : true

  return (
    <div
      style={{
        position: 'relative',
        padding: '20px 22px 18px',
        background: '#0f0f0f',
        color: '#fafaf5',
        borderRadius: 10,
        overflow: 'hidden',
        minHeight: 110,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at top right, rgba(255, 199, 0, 0.18), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: 'rgba(255, 199, 0, 0.9)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 10 }}>
          {delta && Number.isFinite(delta.pct) && delta.pct !== 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isGood ? goodColor : badColor,
              }}
            >
              {delta.pct > 0 ? '+' : ''}
              {delta.pct.toFixed(1)}%
            </span>
          )}
          {subValue && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{subValue}</span>
          )}
        </div>
      </div>
    </div>
  )
}

type Props = {
  searchParams: Promise<{ tab?: string; gap?: string }>
}

const VALID_TABS = ['overview', 'search', 'traffic', 'rankings', 'competitors', 'llm'] as const
type TabId = (typeof VALID_TABS)[number]

export default async function AnalyticsOverviewPage({ searchParams }: Props) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/admin/login')

  const sp = await searchParams
  const requestedTab = sp.tab
  const tab: TabId = (VALID_TABS as readonly string[]).includes(requestedTab ?? '')
    ? (requestedTab as TabId)
    : 'overview'

  const [
    ga4,
    gsc,
    competitorSnapshots,
    keywordRankings,
    trackedCompetitors,
    trackedKeywords,
    llmSnapshots,
    llmPrompts,
  ] = await Promise.all([
    payload.find({
      collection: 'analytics-ga4-snapshots',
      sort: '-snapshotDate',
      limit: 60,
      depth: 0,
    }),
    payload.find({
      collection: 'analytics-gsc-snapshots',
      sort: '-snapshotDate',
      limit: 60,
      depth: 0,
    }),
    payload.find({
      collection: 'analytics-competitor-snapshots',
      sort: '-snapshotDate',
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'analytics-keyword-rankings',
      sort: '-snapshotDate',
      limit: 500,
      depth: 0,
    }),
    payload.find({
      collection: 'tracked-competitors',
      where: { active: { equals: true } },
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'tracked-keywords',
      where: { active: { equals: true } },
      limit: 200,
      depth: 0,
    }),
    payload.find({
      collection: 'llm-mention-snapshots',
      sort: '-snapshotDate',
      limit: 500,
      depth: 0,
    }),
    payload.find({
      collection: 'llm-target-prompts',
      where: { active: { equals: true } },
      limit: 100,
      depth: 0,
    }),
  ])

  // Active sets used to gate which historical snapshots show on the dashboard.
  // Removing/pausing a competitor should hide their card immediately even if
  // their old snapshots still exist in D1.
  const normalizeDom = (s: string) =>
    (s ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  const activeCompetitorDomains = new Set(
    (trackedCompetitors.docs as any[]).map((c) => normalizeDom(c.domain ?? '')),
  )
  const activeKeywords = new Set(
    (trackedKeywords.docs as any[]).map((k) => (k.keyword ?? '').toLowerCase().trim()),
  )

  const hasGa4 = ga4.docs.length > 0
  const hasGsc = gsc.docs.length > 0
  const hasDfs = competitorSnapshots.docs.length > 0

  if (!hasGa4 && !hasGsc && !hasDfs) {
    return (
      <Gutter>
        <PageHeader />
        <EmptyAnalyticsState source="analytics" />
      </Gutter>
    )
  }

  const ga4Recent = ga4.docs.slice(0, 30)
  const ga4Prior = ga4.docs.slice(30, 60)
  const gscRecent = gsc.docs.slice(0, 30)
  const gscPrior = gsc.docs.slice(30, 60)

  const sessions30 = sumWindow(ga4Recent, 'sessions')
  const sessionsPrior = sumWindow(ga4Prior, 'sessions')
  const users30 = sumWindow(ga4Recent, 'users')
  const usersPrior = sumWindow(ga4Prior, 'users')
  const pageviews30 = sumWindow(ga4Recent, 'pageviews')
  const pageviewsPrior = sumWindow(ga4Prior, 'pageviews')

  const impressions30 = sumWindow(gscRecent, 'impressions')
  const impressionsPrior = sumWindow(gscPrior, 'impressions')
  const clicks30 = sumWindow(gscRecent, 'clicks')
  const clicksPrior = sumWindow(gscPrior, 'clicks')
  const ctr30 = impressions30 ? (clicks30 / impressions30) * 100 : 0
  const ctrPrior = impressionsPrior ? (clicksPrior / impressionsPrior) * 100 : 0
  const positionEntries = gscRecent.map((d: any) => d.avgPosition).filter((p: number) => p)
  const avgPosition30 = positionEntries.length
    ? positionEntries.reduce((s: number, p: number) => s + p, 0) / positionEntries.length
    : 0

  // Combined daily trend: chronological, with both GA4 sessions and GSC clicks
  // (different sources, but plotted on the same time axis so the shape is comparable).
  const ga4ByDate = new Map<string, any>()
  ga4.docs.forEach((d: any) => {
    const k = (d.snapshotDate ?? '').split('T')[0]
    ga4ByDate.set(k, d)
  })
  const gscByDate = new Map<string, any>()
  gsc.docs.forEach((d: any) => {
    const k = (d.snapshotDate ?? '').split('T')[0]
    gscByDate.set(k, d)
  })
  const allDates = Array.from(new Set([...ga4ByDate.keys(), ...gscByDate.keys()])).sort()

  // Monthly aggregation for the Overview compact chart. Buckets daily
  // GA4 + GSC counts into YYYY-MM-01 keys so the chart renders ~6 points
  // instead of 60+, and reads as a clean trend shape.
  const monthlyAgg = new Map<string, { sessions: number; clicks: number; impressions: number }>()
  for (const date of allDates) {
    const monthKey = date.substring(0, 7) + '-01'
    const cur = monthlyAgg.get(monthKey) ?? { sessions: 0, clicks: 0, impressions: 0 }
    cur.sessions += ga4ByDate.get(date)?.sessions ?? 0
    cur.impressions += gscByDate.get(date)?.impressions ?? 0
    cur.clicks += gscByDate.get(date)?.clicks ?? 0
    monthlyAgg.set(monthKey, cur)
  }
  const monthlyTrendData = Array.from(monthlyAgg.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  // Latest snapshots for top tables
  const latestGa4 = ga4.docs[0] as any
  const latestGsc = gsc.docs[0] as any
  const topQueries: QueryRow[] = Array.isArray(latestGsc?.topQueries) ? latestGsc.topQueries : []
  const topPagesGa4: PageRow[] = Array.isArray(latestGa4?.topPages) ? latestGa4.topPages : []
  const topPagesGsc: PageRow[] = Array.isArray(latestGsc?.topPages) ? latestGsc.topPages : []
  const topSources: SourceRow[] = Array.isArray(latestGa4?.topSources) ? latestGa4.topSources : []

  // DataForSEO: latest snapshot for our domain (full top-100 keyword list)
  const ourLatestSnapshot = competitorSnapshots.docs.find(
    (s: any) => s.domain === OUR_DOMAIN,
  ) as any
  const ourTopKeywords: Array<{
    keyword: string
    position: number
    searchVolume: number
    url: string
  }> = Array.isArray(ourLatestSnapshot?.topKeywords) ? ourLatestSnapshot.topKeywords : []
  const dfsEstimatedTraffic = ourLatestSnapshot?.estimatedTraffic ?? 0
  const dfsRankedCount = ourLatestSnapshot?.rankedKeywordsCount ?? 0

  // DataForSEO: latest competitor snapshots (latest first per domain).
  // Filtered to the currently-active tracked competitors so removing or
  // pausing a competitor hides its card right away, without having to wait
  // for the next cron run to overwrite anything.
  const competitorByDomain = new Map<string, any[]>()
  competitorSnapshots.docs.forEach((s: any) => {
    const dom = normalizeDom(s.domain ?? '')
    if (dom === OUR_DOMAIN) return
    if (!activeCompetitorDomains.has(dom)) return
    const list = competitorByDomain.get(dom) ?? []
    list.push(s)
    competitorByDomain.set(dom, list)
  })
  const competitorCards = Array.from(competitorByDomain.entries()).map(([domain, snaps]) => {
    const sorted = snaps.sort((a, b) =>
      String(b.snapshotDate ?? '').localeCompare(String(a.snapshotDate ?? '')),
    )
    return { domain, latest: sorted[0] }
  })

  // Build the keyword set the gap matrix uses for our column. The DataForSEO
  // snapshot's topKeywords is volume-truncated, so a tracked keyword we DO
  // rank for can be missing from the matrix even though it shows up in the
  // per-keyword tracker. Overlay analytics-keyword-rankings (latest entry
  // per keyword) on top of the snapshot so the matrix sees both sources.
  const mergedOurKeywords = (() => {
    const map = new Map<string, { keyword: string; position: number; searchVolume: number; url?: string }>()
    for (const k of parseKeywordArray(ourLatestSnapshot?.topKeywords)) {
      map.set(k.keyword.toLowerCase(), k)
    }
    const latestPerKeyword = new Map<string, any>()
    for (const r of keywordRankings.docs as any[]) {
      const key = (r.keyword ?? '').toLowerCase().trim()
      if (!key) continue
      const cur = latestPerKeyword.get(key)
      if (!cur || String(r.snapshotDate ?? '') > String(cur.snapshotDate ?? '')) {
        latestPerKeyword.set(key, r)
      }
    }
    for (const [key, r] of latestPerKeyword) {
      if (!r.position) continue
      if (!map.has(key)) {
        map.set(key, {
          keyword: r.keyword,
          position: r.position,
          searchVolume: r.searchVolume ?? 0,
          url: r.url ?? '',
        })
      }
    }
    return Array.from(map.values())
  })()

  // Tracked keyword rankings: group by keyword, latest + prior week.
  // Filtered to currently-active tracked keywords so removed ones drop off.
  const rankingsByKeyword = new Map<string, any[]>()
  keywordRankings.docs.forEach((r: any) => {
    const kw = (r.keyword ?? '').toLowerCase().trim()
    if (!activeKeywords.has(kw)) return
    const list = rankingsByKeyword.get(r.keyword) ?? []
    list.push(r)
    rankingsByKeyword.set(r.keyword, list)
  })
  const trackedKeywordRows = Array.from(rankingsByKeyword.entries())
    .map(([keyword, list]) => {
      const sorted = list.sort((a, b) =>
        String(b.snapshotDate ?? '').localeCompare(String(a.snapshotDate ?? '')),
      )
      return { keyword, current: sorted[0], prior: sorted[1] }
    })
    .sort((a, b) => {
      const av = a.current?.searchVolume ?? 0
      const bv = b.current?.searchVolume ?? 0
      return bv - av
    })

  // LLM mentions: group by prompt, get latest result per platform, filter to
  // currently-active prompts.
  const activePromptSet = new Set(
    (llmPrompts.docs as any[]).map((p) => (p.prompt ?? '').toLowerCase().trim()),
  )
  const llmByPromptPlatform = new Map<string, Map<string, any>>()
  llmSnapshots.docs.forEach((s: any) => {
    const promptKey = (s.prompt ?? '').toLowerCase().trim()
    if (!activePromptSet.has(promptKey)) return
    const platformMap = llmByPromptPlatform.get(promptKey) ?? new Map<string, any>()
    const existing = platformMap.get(s.platform)
    if (
      !existing ||
      String(existing.snapshotDate ?? '').localeCompare(String(s.snapshotDate ?? '')) < 0
    ) {
      platformMap.set(s.platform, s)
    }
    llmByPromptPlatform.set(promptKey, platformMap)
  })
  const llmRows = (llmPrompts.docs as any[]).map((p: any) => {
    const key = (p.prompt ?? '').toLowerCase().trim()
    const platformMap = llmByPromptPlatform.get(key) ?? new Map<string, any>()
    return {
      prompt: p.prompt as string,
      claude: platformMap.get('claude') ?? null,
      chatgpt: platformMap.get('chatgpt') ?? null,
      perplexity: platformMap.get('perplexity') ?? null,
    }
  })

  return (
    <Gutter>
      <PageHeader />

      {/* KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        <KPI
          label="Sessions"
          value={hasGa4 ? fmt(sessions30) : '—'}
          delta={hasGa4 ? delta(sessions30, sessionsPrior) : undefined}
          subValue="last 30 days"
        />
        <KPI
          label="Users"
          value={hasGa4 ? fmt(users30) : '—'}
          delta={hasGa4 ? delta(users30, usersPrior) : undefined}
          subValue="last 30 days"
        />
        <KPI
          label="Pageviews"
          value={hasGa4 ? fmt(pageviews30) : '—'}
          delta={hasGa4 ? delta(pageviews30, pageviewsPrior) : undefined}
          subValue="last 30 days"
        />
        <KPI
          label="Search Impressions"
          value={hasGsc ? fmt(impressions30) : '—'}
          delta={hasGsc ? delta(impressions30, impressionsPrior) : undefined}
          subValue="last 30 days"
        />
        <KPI
          label="Search Clicks"
          value={hasGsc ? fmt(clicks30) : '—'}
          delta={hasGsc ? delta(clicks30, clicksPrior) : undefined}
          subValue="last 30 days"
        />
        <KPI
          label="Avg CTR"
          value={hasGsc ? `${ctr30.toFixed(2)}%` : '—'}
          delta={hasGsc ? delta(ctr30, ctrPrior) : undefined}
          subValue="last 30 days"
        />
        <KPI
          label="Avg Position"
          value={hasGsc ? avgPosition30.toFixed(1) : '—'}
          higherIsBetter={false}
          subValue="last 30 days"
        />
        <KPI
          label="Est. Organic Traffic"
          value={hasDfs ? fmt(dfsEstimatedTraffic) : '—'}
          subValue={hasDfs ? `${fmt(dfsRankedCount)} ranked keywords` : 'awaiting first run'}
        />
      </div>

      <TabNav active={tab} />

      {/* Overview tab: monthly traffic chart + traffic source pie + tracked keywords */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 28 }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: '-0.2px' }}>
                  Monthly traffic
                </h2>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--theme-elevation-600, #666)' }}>
                  <LegendDot color="#FFC700" label="Sessions" />
                  <LegendDot color="#111" label="Impressions" />
                  <LegendDot color="#16a34a" label="Clicks" />
                </div>
              </div>
              {monthlyTrendData.length === 0 ? (
                <EmptyTableNote text="No traffic data yet." />
              ) : (
                <TrendLineChart
                  data={monthlyTrendData}
                  series={[
                    { key: 'sessions', label: 'Sessions', color: '#FFC700' },
                    { key: 'impressions', label: 'Impressions', color: '#111' },
                    { key: 'clicks', label: 'Clicks', color: '#16a34a' },
                  ]}
                  height={220}
                  dateGranularity="month"
                />
              )}
            </div>

            <div style={cardStyle}>
              <SectionHeader
                title="Traffic by source"
                subtitle={
                  latestGa4
                    ? `Yesterday's sessions by source (${String(latestGa4.snapshotDate ?? '').split('T')[0]}).`
                    : 'Awaiting first GA4 snapshot.'
                }
              />
              <TrafficSourcesPie
                data={topSources.map((s) => ({ name: s.source || '(direct)', value: s.sessions }))}
                height={200}
              />
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 28 }}>
            <SectionHeader
              title="Tracked keyword rankings"
              subtitle="Position this week vs last week for keywords you're monitoring."
            />
            {trackedKeywordRows.length === 0 ? (
              <EmptyTableNote text="No tracked keyword rankings yet. Add keywords in Tracked Keywords + run analysis." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Keyword</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>This Week</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Last Week</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Δ</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Vol/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {trackedKeywordRows.map((row, i) => {
                    const cur = row.current?.position ?? null
                    const prev = row.prior?.position ?? null
                    const change = cur != null && prev != null ? prev - cur : null
                    return (
                      <tr key={row.keyword + i}>
                        <td style={cellStyle}>{row.keyword}</td>
                        <td
                          style={{
                            ...cellStyle,
                            textAlign: 'right',
                            fontWeight: 700,
                            color: cur != null ? positionColor(cur) : 'var(--theme-elevation-400, #999)',
                          }}
                        >
                          {cur ?? '—'}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', color: 'var(--theme-elevation-500, #888)' }}>
                          {prev ?? '—'}
                        </td>
                        <td
                          style={{
                            ...cellStyle,
                            textAlign: 'right',
                            fontWeight: 700,
                            color:
                              change == null || change === 0
                                ? 'var(--theme-elevation-500, #888)'
                                : change > 0
                                  ? '#16a34a'
                                  : '#dc2626',
                          }}
                        >
                          {change == null
                            ? '—'
                            : change === 0
                              ? '·'
                              : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}`}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right' }}>
                          {fmt(row.current?.searchVolume ?? 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Search Console tab: top queries + top landing pages from search */}
      {tab === 'search' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={cardStyle}>
            <SectionHeader title="Top Search Queries" subtitle="Yesterday's leaders by impressions" />
            {topQueries.length === 0 ? (
              <EmptyTableNote text="No Search Console data yet." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Query</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Impr.</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Clicks</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.slice(0, 10).map((q, i) => (
                    <tr key={q.query + i}>
                      <td style={cellStyle}>{q.query}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{fmt(q.impressions)}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', color: q.clicks > 0 ? '#16a34a' : 'var(--theme-elevation-500, #888)' }}>
                        {fmt(q.clicks)}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={cardStyle}>
            <SectionHeader title="Top Landing Pages from Search" subtitle="Pages getting the most search traffic" />
            {topPagesGsc.length === 0 ? (
              <EmptyTableNote text="No Search Console data yet." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Page</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Impr.</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {topPagesGsc.slice(0, 10).map((p, i) => (
                    <tr key={(p.page ?? '') + i}>
                      <td
                        style={{
                          ...cellStyle,
                          maxWidth: 240,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {(p.page ?? '').replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{fmt(p.impressions ?? 0)}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', color: (p.clicks ?? 0) > 0 ? '#16a34a' : 'var(--theme-elevation-500, #888)' }}>
                        {fmt(p.clicks ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Traffic tab: top pages + top sources (both GA4) */}
      {tab === 'traffic' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={cardStyle}>
            <SectionHeader title="Top Pages" subtitle="Yesterday's most-viewed pages" />
            {topPagesGa4.length === 0 ? (
              <EmptyTableNote text="No GA4 data yet." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Page</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Pageviews</th>
                  </tr>
                </thead>
                <tbody>
                  {topPagesGa4.slice(0, 10).map((p, i) => (
                    <tr key={(p.path ?? '') + i}>
                      <td
                        style={{
                          ...cellStyle,
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.path}
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{fmt(p.pageviews ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={cardStyle}>
            <SectionHeader title="Top Traffic Sources" subtitle="How visitors found the site yesterday" />
            {topSources.length === 0 ? (
              <EmptyTableNote text="No GA4 data yet." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Source</th>
                    <th style={{ ...headerCellStyle, textAlign: 'right' }}>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {topSources.slice(0, 10).map((s, i) => (
                    <tr key={s.source + i}>
                      <td style={cellStyle}>{s.source}</td>
                      <td style={{ ...cellStyle, textAlign: 'right' }}>{fmt(s.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Rankings tab: where you rank + tracked keyword rankings */}
      {tab === 'rankings' && (<>
      <div style={{ ...cardStyle, marginBottom: 28 }}>
        <SectionHeader
          title="Where you currently rank on Google"
          subtitle={
            ourLatestSnapshot
              ? `Top ${Math.min(ourTopKeywords.length, 25)} of ${fmt(dfsRankedCount)} ranked keywords, by monthly search volume. Snapshot from ${String(ourLatestSnapshot.snapshotDate ?? '').split('T')[0]}.`
              : 'Awaiting first DataForSEO snapshot.'
          }
        />
        {ourTopKeywords.length === 0 ? (
          <EmptyTableNote text="No DataForSEO data yet. Trigger a snapshot to populate." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Keyword</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Pos.</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Vol/mo</th>
                <th style={headerCellStyle}>Page</th>
              </tr>
            </thead>
            <tbody>
              {ourTopKeywords.slice(0, 25).map((k, i) => (
                <tr key={k.keyword + i}>
                  <td style={cellStyle}>{k.keyword}</td>
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: positionColor(k.position),
                    }}
                  >
                    {k.position}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>{fmt(k.searchVolume)}</td>
                  <td
                    style={{
                      ...cellStyle,
                      maxWidth: 320,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--theme-elevation-500, #888)',
                    }}
                  >
                    {(k.url ?? '').replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tracked keyword rankings */}
      <div style={{ ...cardStyle, marginBottom: 28 }}>
        <SectionHeader
          title="Tracked keyword rankings"
          subtitle="Position this week vs last week for keywords you're monitoring."
          action={<ManageLinkButton href="/admin/analytics/keywords" label="Add tracked keyword" />}
        />
        {trackedKeywordRows.length === 0 ? (
          <EmptyTableNote text="No tracked keyword rankings yet. Add keywords in Tracked Keywords + run the weekly cron." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Keyword</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>This Week</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Last Week</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Δ</th>
                <th style={{ ...headerCellStyle, textAlign: 'right' }}>Vol/mo</th>
              </tr>
            </thead>
            <tbody>
              {trackedKeywordRows.map((row, i) => {
                const cur = row.current?.position ?? null
                const prev = row.prior?.position ?? null
                const change = cur != null && prev != null ? prev - cur : null // positive means improved
                return (
                  <tr key={row.keyword + i}>
                    <td style={cellStyle}>{row.keyword}</td>
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: cur != null ? positionColor(cur) : 'var(--theme-elevation-400, #999)',
                      }}
                    >
                      {cur ?? '—'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: 'var(--theme-elevation-500, #888)' }}>
                      {prev ?? '—'}
                    </td>
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          change == null || change === 0
                            ? 'var(--theme-elevation-500, #888)'
                            : change > 0
                              ? '#16a34a'
                              : '#dc2626',
                      }}
                    >
                      {change == null
                        ? '—'
                        : change === 0
                          ? '·'
                          : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}`}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      {fmt(row.current?.searchVolume ?? 0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      </>)}

      {/* Competitors tab: per-competitor cards */}
      {tab === 'competitors' && competitorCards.length === 0 && (
        <div style={{ ...cardStyle, marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-elevation-500, #888)' }}>
            No competitor snapshots yet. Add competitors in Tracked Competitors and click {'"'}Run analysis now{'"'} to populate.
          </p>
        </div>
      )}
      {tab === 'competitors' && competitorCards.length > 0 && (
        <GapAnalysis
          ourKeywords={mergedOurKeywords}
          competitors={competitorCards.map(({ domain, latest }) => ({
            domain,
            // Quality-gate the competitor's keyword set: only consider
            // keywords where they rank in the top 30 (otherwise a high-volume
            // keyword they rank #80 for still shows up and clutters the
            // matrix), then take the 30 highest-volume of those. The stored
            // topKeywords is already volume-desc, so we filter then slice.
            keywords: parseKeywordArray(latest?.topKeywords)
              .filter((k) => k.position && k.position <= 30)
              .slice(0, 30),
            estimatedTraffic: latest?.estimatedTraffic ?? 0,
            rankedKeywordsCount: latest?.rankedKeywordsCount ?? 0,
            snapshotDate: String(latest?.snapshotDate ?? '').split('T')[0],
          }))}
        />
      )}

      {/* LLM Mentions tab: per-prompt × per-platform mention grid */}
      {tab === 'llm' && (
        <LLMMentionsTab
          rows={llmRows}
          competitorDomains={Array.from(activeCompetitorDomains)}
        />
      )}
    </Gutter>
  )
}

interface LLMRow {
  prompt: string
  claude: any
  chatgpt: any
  perplexity: any
}


const PLATFORM_META: Array<{ id: 'claude' | 'chatgpt' | 'perplexity'; label: string }> = [
  { id: 'claude', label: 'Claude' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'perplexity', label: 'Perplexity' },
]

const OUR_BRAND_KEY = OUR_DOMAIN

interface BrandStat {
  domain: string
  isUs: boolean
  /** Total samples across all platforms that mentioned this brand. */
  mentions: number
  citations: string[]
}

/**
 * For a single prompt, sum sample-level mentions and citations per brand
 * across all three platform responses. "Brand" = our domain plus each
 * currently-tracked competitor domain.
 *
 * Multi-sample data: each platform response stores samplesTotal +
 * samplesMentioned (how many of N independent samples cited the brand).
 * This function counts at the sample level so SOV downstream is "% of
 * samples that mention this brand", not "% of platforms".
 *
 * Backward compat: rows without samples_total fall back to the boolean
 * mentioned field (effectively 1 sample, 1 if mentioned else 0).
 */
function rankBrandsForPrompt(row: LLMRow, allCompetitorDomains: string[]): BrandStat[] {
  const stats = new Map<string, BrandStat>()
  const candidates = [OUR_BRAND_KEY, ...allCompetitorDomains]
  for (const domain of candidates) {
    stats.set(domain, { domain, isUs: domain === OUR_BRAND_KEY, mentions: 0, citations: [] })
  }

  // Per-domain dedupe set for citations (URLs may repeat across platforms)
  const seenCitations = new Map<string, Set<string>>()
  for (const domain of candidates) seenCitations.set(domain, new Set())

  const platforms: Array<'claude' | 'chatgpt' | 'perplexity'> = ['claude', 'chatgpt', 'perplexity']
  for (const p of platforms) {
    const snap = row[p]
    if (!snap || snap.errorMessage) continue

    const samplesTotal: number = typeof snap.samplesTotal === 'number' && snap.samplesTotal > 0
      ? snap.samplesTotal
      : 1

    // Mentions for us — count at the sample level
    const ourSampleHits: number = typeof snap.samplesMentioned === 'number'
      ? snap.samplesMentioned
      : (snap.mentioned ? 1 : 0)
    const us = stats.get(OUR_BRAND_KEY)
    if (us) us.mentions += ourSampleHits

    // Competitor mentions — prefer sampledMentions when present
    const cms: Array<{ domain: string; mentioned: boolean; sampledMentions?: number }> =
      Array.isArray(snap.competitorMentions) ? snap.competitorMentions : []
    for (const cm of cms) {
      const key = (cm.domain ?? '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      const stat = stats.get(key)
      if (!stat) continue
      const hits =
        typeof cm.sampledMentions === 'number' ? cm.sampledMentions : (cm.mentioned ? 1 : 0)
      stat.mentions += hits
    }

    // Citations: attribute each URL to a brand by hostname match (deduped)
    const urls: string[] = Array.isArray(snap.citedUrls) ? snap.citedUrls : []
    for (const url of urls) {
      let host = ''
      try {
        host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      } catch {
        continue
      }
      for (const [domain, dedupeSet] of seenCitations.entries()) {
        if (host === domain || host.endsWith('.' + domain)) {
          if (!dedupeSet.has(url)) {
            dedupeSet.add(url)
            stats.get(domain)?.citations.push(url)
          }
          break
        }
      }
    }

    // Use samplesTotal in the closure so the variable is referenced (helps
    // future readers see why we read it; otherwise it's only used via the
    // shareOfVoice denominator computed in countResponsesForPrompt).
    void samplesTotal
  }

  return Array.from(stats.values())
    .filter((s) => s.mentions > 0 || s.citations.length > 0)
    .sort((a, b) => {
      if (b.mentions !== a.mentions) return b.mentions - a.mentions
      return b.citations.length - a.citations.length
    })
}

/**
 * Share of voice = % of AI responses that mention this brand.
 *
 * `responseCount` is the number of platform responses successfully run for
 * this prompt (excluding errors / unconfigured platforms). Each brand's
 * mention count divided by that total gives the response-coverage rate.
 *
 * Note: SOV values across brands intentionally don't sum to 100% — multiple
 * brands routinely appear in the same response, so each rate is independent.
 */
function shareOfVoice(stats: BrandStat[], responseCount: number): Map<string, number> {
  const result = new Map<string, number>()
  for (const stat of stats) {
    result.set(stat.domain, responseCount > 0 ? stat.mentions / responseCount : 0)
  }
  return result
}

/**
 * Returns the total sample count for a prompt across all platform responses
 * — used as the denominator for response-coverage Share of Voice.
 *
 * For new multi-sampled rows, sums each platform's samplesTotal.
 * For legacy single-sample rows, falls back to a count of platforms.
 */
function countResponsesForPrompt(row: LLMRow): number {
  let n = 0
  for (const p of ['claude', 'chatgpt', 'perplexity'] as const) {
    const snap = row[p]
    if (!snap || snap.errorMessage) continue
    n += typeof snap.samplesTotal === 'number' && snap.samplesTotal > 0 ? snap.samplesTotal : 1
  }
  return n
}

const LLMMentionsTab: React.FC<{ rows: LLMRow[]; competitorDomains: string[] }> = ({
  rows,
  competitorDomains,
}) => {
  if (rows.length === 0) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-elevation-500, #888)' }}>
          No prompts yet. Add prompts in <strong>LLM Prompts</strong> and click {'"'}Run analysis now{'"'} to populate.
        </p>
      </div>
    )
  }

  // Per-platform stats — counted at the sample level when available, with
  // a fallback to one-sample-per-row for legacy snapshots.
  const platformStats = PLATFORM_META.map(({ id, label }) => {
    let tested = 0
    let mentioned = 0
    rows.forEach((r) => {
      const snap = r[id]
      if (!snap) return
      if (snap.errorMessage) return
      const samples = typeof snap.samplesTotal === 'number' && snap.samplesTotal > 0
        ? snap.samplesTotal
        : 1
      const hits = typeof snap.samplesMentioned === 'number'
        ? snap.samplesMentioned
        : (snap.mentioned ? 1 : 0)
      tested += samples
      mentioned += hits
    })
    return { id, label, tested, mentioned, rate: tested > 0 ? mentioned / tested : 0 }
  })

  // Aggregate competitor visibility across all snapshots: who's getting cited
  // when *we* aren't?
  const competitorWins = new Map<string, { total: number; whenWeMissed: number }>()
  rows.forEach((r) => {
    PLATFORM_META.forEach(({ id }) => {
      const snap = r[id]
      if (!snap || snap.errorMessage) return
      const weMentioned = Boolean(snap.mentioned)
      const compMentions: Array<{ domain: string; mentioned: boolean }> =
        Array.isArray(snap.competitorMentions) ? snap.competitorMentions : []
      compMentions.forEach((c) => {
        if (!c.mentioned) return
        const cur = competitorWins.get(c.domain) ?? { total: 0, whenWeMissed: 0 }
        cur.total++
        if (!weMentioned) cur.whenWeMissed++
        competitorWins.set(c.domain, cur)
      })
    })
  })
  const competitorRows = Array.from(competitorWins.entries())
    .sort(([, a], [, b]) => b.whenWeMissed - a.whenWeMissed || b.total - a.total)
    .slice(0, 15)

  const headerCellStyleLocal: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--theme-elevation-500, #888)',
    textAlign: 'left',
    borderBottom: '1px solid var(--theme-elevation-200, #ddd)',
  }
  const cellStyleLocal: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 12,
    color: 'var(--theme-elevation-800, #333)',
    borderBottom: '1px solid var(--theme-elevation-100, #e5e5e0)',
  }

  // Aggregate "how often is the brand cited overall" across every prompt
  // and platform. This is the headline number for the page.
  const totalSamples = rows.reduce((acc, r) => acc + countResponsesForPrompt(r), 0)
  const totalOurMentions = platformStats.reduce((acc, s) => acc + s.mentioned, 0)
  const overallRate = totalSamples > 0 ? totalOurMentions / totalSamples : 0
  const overallPct = Math.round(overallRate * 100)
  const overallColor = overallPct >= 50 ? '#16a34a' : overallPct >= 20 ? '#FFC700' : '#dc2626'

  function plainOverallVerdict(pct: number, count: number, total: number): string {
    if (total === 0) return 'No data yet. Run an analysis to see how often AI assistants mention you.'
    if (pct === 0) return `AI assistants did not mention ${OUR_BRAND_DISPLAY} in any of the ${total} answers we checked this week.`
    if (pct < 20) return `${OUR_BRAND_DISPLAY} was mentioned in ${count} of ${total} AI answers. That is rare so there is room to grow.`
    if (pct < 50) return `${OUR_BRAND_DISPLAY} showed up in ${count} of ${total} AI answers. Some assistants know about you, others do not.`
    if (pct < 75) return `${OUR_BRAND_DISPLAY} was mentioned in ${count} of ${total} AI answers. AI assistants reliably know about you for these questions.`
    return `${OUR_BRAND_DISPLAY} was mentioned in ${count} of ${total} AI answers. AI assistants almost always cite you for these questions.`
  }

  return (
    <>
      {/* Hero card: overall visibility */}
      <div
        style={{
          padding: '24px 28px',
          marginBottom: 18,
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: '#fafaf5',
          borderRadius: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at top right, rgba(255, 199, 0, 0.18), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#FFC700',
              marginBottom: 8,
            }}
          >
            Your AI Visibility
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: overallColor,
              }}
            >
              {overallPct}%
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              of AI answers mention {OUR_BRAND_DISPLAY} this week
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            {plainOverallVerdict(overallPct, totalOurMentions, totalSamples)}
          </p>
        </div>
      </div>

      {/* Plain-English explainer */}
      <div
        style={{
          padding: '14px 18px',
          marginBottom: 20,
          background: 'rgba(255, 199, 0, 0.08)',
          border: '1px solid rgba(255, 199, 0, 0.4)',
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#0f0f0f',
              background: '#FFC700',
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            How to read this
          </span>
          <span style={{ fontSize: 11, color: 'var(--theme-elevation-600, #666)' }}>
            {fmt(totalSamples)} AI answers analyzed this week
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-elevation-700, #444)', lineHeight: 1.55 }}>
          AI assistants give a different answer every time, even to the exact same question.
          To get a reliable picture, we ask each of your tracked questions five times on Claude, ChatGPT, and Perplexity every week.
          The percentages on this page are how often {OUR_BRAND_DISPLAY} was mentioned across all those answers.
          The numbers will get more accurate as we collect more weeks of data.
        </p>
      </div>

      {/* Per-platform cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {platformStats.map(({ id, label, tested, mentioned, rate }) => {
          const pct = Math.round(rate * 100)
          const barColor = pct >= 50 ? '#16a34a' : pct > 0 ? '#FFC700' : '#dc2626'
          let plain = ''
          if (tested === 0) plain = 'Not configured or no answers yet.'
          else if (mentioned === 0) plain = `${label} did not mention you in any of the ${tested} answers we tested.`
          else plain = `${label} mentioned you in ${mentioned} out of ${tested} answers.`
          return (
            <div key={id} style={{ ...cardStyle, padding: '18px 20px' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--theme-elevation-500, #888)',
                  marginBottom: 8,
                }}
              >
                {label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: barColor }}>
                  {pct}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'var(--theme-elevation-100, #eee)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    transition: 'width 200ms ease',
                  }}
                />
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-600, #666)', lineHeight: 1.4 }}>
                {plain}
              </p>
            </div>
          )
        })}
      </div>

      {/* Question scorecard: one card per prompt with plain-language verdict */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '-0.2px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Question scorecard
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--theme-elevation-500, #888)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            How well {OUR_BRAND_DISPLAY} shows up for each of your tracked questions. Click a card to see the full brand rankings, the AI responses, and the URLs that were cited.
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <ManageLinkButton href="/admin/analytics/llm-prompts" label="Add tracked prompt" />
        </div>
      </div>

      {/* Per-prompt scorecards */}
      <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
        {rows.map((r, i) => {
          const platforms = PLATFORM_META.map(({ id, label }) => ({
            id,
            label,
            snap: r[id],
          }))
          const ranking = rankBrandsForPrompt(r, competitorDomains)
          const responseCount = countResponsesForPrompt(r)
          const sov = shareOfVoice(ranking, responseCount)
          const ourStat = ranking.find((s) => s.isUs)
          const ourMentions = ourStat?.mentions ?? 0
          const ourPct = responseCount > 0 ? Math.round((ourMentions / responseCount) * 100) : 0

          let verdict: 'strong' | 'partial' | 'weak' | 'missing'
          let verdictLabel: string
          let verdictColor: string
          let verdictBg: string
          if (responseCount === 0) {
            verdict = 'missing'
            verdictLabel = 'No data'
            verdictColor = 'var(--theme-elevation-500, #888)'
            verdictBg = 'var(--theme-elevation-100, #eee)'
          } else if (ourPct === 0) {
            verdict = 'missing'
            verdictLabel = 'Missing'
            verdictColor = '#fff'
            verdictBg = '#dc2626'
          } else if (ourPct < 33) {
            verdict = 'weak'
            verdictLabel = 'Weak'
            verdictColor = '#7c2d12'
            verdictBg = '#fde68a'
          } else if (ourPct < 66) {
            verdict = 'partial'
            verdictLabel = 'Inconsistent'
            verdictColor = '#854d0e'
            verdictBg = '#fef08a'
          } else {
            verdict = 'strong'
            verdictLabel = 'Strong'
            verdictColor = '#fff'
            verdictBg = '#16a34a'
          }

          // Per-platform plain summary
          const perPlatform = platforms.map((p) => {
            const snap = p.snap
            if (!snap || snap.errorMessage) return `${p.label}: not tested`
            const total = typeof snap.samplesTotal === 'number' && snap.samplesTotal > 0 ? snap.samplesTotal : 1
            const hits = typeof snap.samplesMentioned === 'number' ? snap.samplesMentioned : (snap.mentioned ? 1 : 0)
            return `${p.label}: ${hits}/${total}`
          }).join('  ·  ')

          // Plain language verdict line
          let plainLine: string
          if (responseCount === 0) {
            plainLine = 'No AI answers yet for this question.'
          } else if (ourPct === 0) {
            plainLine = `No AI assistant mentioned ${OUR_BRAND_DISPLAY} in any of the ${responseCount} answers we checked.`
          } else {
            plainLine = `${OUR_BRAND_DISPLAY} was mentioned in ${ourMentions} of ${responseCount} AI answers (${ourPct}%).`
          }

          return (
            <details
              key={r.prompt + i}
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${
                  verdict === 'strong' ? '#16a34a' :
                  verdict === 'partial' ? '#FFC700' :
                  verdict === 'weak' ? '#fde68a' :
                  '#dc2626'
                }`,
                padding: 0,
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '16px 20px',
                  listStyle: 'none',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      flex: '0 0 auto',
                      padding: '4px 10px',
                      background: verdictBg,
                      color: verdictColor,
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {verdictLabel}
                  </span>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px', marginBottom: 4 }}>
                      {r.prompt}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-700, #444)', lineHeight: 1.5 }}>
                      {plainLine}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--theme-elevation-500, #888)' }}>
                      {perPlatform}
                    </p>
                  </div>
                  <span
                    style={{
                      flex: '0 0 auto',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--theme-elevation-500, #888)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Click to expand
                  </span>
                </div>
              </summary>

              <div style={{ padding: '0 20px 20px' }}>
                {/* Brand rankings table */}
                {ranking.length > 0 && (
                  <div style={{ marginBottom: 14, overflow: 'auto' }}>
                    <h4
                      style={{
                        margin: '0 0 8px',
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--theme-elevation-500, #888)',
                      }}
                    >
                      Who got mentioned for this question
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...headerCellStyle, width: 60 }}>Rank</th>
                          <th style={headerCellStyle}>Brand</th>
                          <th style={{ ...headerCellStyle, textAlign: 'right', width: 130 }}>How often cited</th>
                          <th style={{ ...headerCellStyle, textAlign: 'right', width: 80 }}>Mentions</th>
                          <th style={{ ...headerCellStyle, textAlign: 'right', width: 100 }}>Source URLs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.slice(0, 15).map((s, idx) => (
                          <tr
                            key={s.domain}
                            style={s.isUs ? { background: 'rgba(255, 199, 0, 0.18)' } : undefined}
                          >
                            <td
                              style={{
                                ...cellStyle,
                                fontWeight: 800,
                                color: idx === 0 ? '#16a34a' : 'inherit',
                              }}
                            >
                              #{idx + 1}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: s.isUs ? 700 : 500 }}>
                              {s.isUs && '★ '}
                              <a
                                href={`https://${s.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'inherit', textDecoration: 'none' }}
                              >
                                {s.domain}
                              </a>
                            </td>
                            <td style={{ ...cellStyle, textAlign: 'right' }}>
                              <SovBar pct={Math.round((sov.get(s.domain) ?? 0) * 100)} />
                            </td>
                            <td style={{ ...cellStyle, textAlign: 'right' }}>{s.mentions}</td>
                            <td style={{ ...cellStyle, textAlign: 'right' }}>
                              <CitationsCell urls={s.citations} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sample answers that mentioned us */}
                {platforms.some((p) => p.snap?.mentioned) && (
                  <div>
                    <h4
                      style={{
                        margin: '0 0 8px',
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--theme-elevation-500, #888)',
                      }}
                    >
                      Sample AI answers that mentioned you
                    </h4>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {platforms
                        .filter((p) => p.snap?.mentioned)
                        .map((p) => (
                          <MentionSnippet key={p.id} label={p.label} snap={p.snap} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )
        })}
      </div>

      {/* Competitor visibility */}
      {competitorRows.length > 0 && (
        <div style={cardStyle}>
          <SectionHeader
            title="Who is being mentioned instead of you"
            subtitle={`When an AI assistant did not mention ${OUR_BRAND_DISPLAY} for one of your questions, these competitors were named instead. Sorted by how often this happened.`}
          />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headerCellStyleLocal}>Competitor</th>
                <th style={{ ...headerCellStyleLocal, textAlign: 'right', width: 160 }}>
                  Cited when you weren&apos;t
                </th>
                <th style={{ ...headerCellStyleLocal, textAlign: 'right', width: 130 }}>
                  Total citations
                </th>
              </tr>
            </thead>
            <tbody>
              {competitorRows.map(([domain, stats]) => (
                <tr key={domain}>
                  <td style={cellStyleLocal}>
                    <a
                      href={`https://${domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {domain}
                    </a>
                  </td>
                  <td style={{ ...cellStyleLocal, textAlign: 'right', fontWeight: 700, color: stats.whenWeMissed > 0 ? '#dc2626' : 'var(--theme-elevation-500, #888)' }}>
                    {stats.whenWeMissed}
                  </td>
                  <td style={{ ...cellStyleLocal, textAlign: 'right' }}>{stats.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/**
 * Tiny bar + percentage label, like the Share-of-Voice cell in the
 * reference design. Color shifts from yellow (low) to green (high).
 */
const SovBar: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct >= 30 ? '#16a34a' : pct >= 10 ? '#65a30d' : pct > 0 ? '#FFC700' : 'var(--theme-elevation-300, #ddd)'
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, minWidth: 80 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: pct > 0 ? 'var(--theme-text, #111)' : 'var(--theme-elevation-500, #888)' }}>
        {pct}%
      </span>
      <div style={{ width: 80, height: 3, background: 'var(--theme-elevation-100, #eee)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, pct * 2.5)}%`,
            height: '100%',
            background: color,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Citation count cell with a click-to-show URL list (uses native <details>
 * so it works without client JS). Hover the count to see a tooltip preview;
 * click to expand the list.
 */
const CitationsCell: React.FC<{ urls: string[] }> = ({ urls }) => {
  if (urls.length === 0) {
    return <span style={{ color: 'var(--theme-elevation-500, #888)' }}>0</span>
  }
  const displayUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    <details style={{ display: 'inline-block', position: 'relative' }}>
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 10,
          background: 'rgba(255, 199, 0, 0.2)',
          color: '#0f0f0f',
          display: 'inline-block',
        }}
        title="Click to see cited URLs"
      >
        {urls.length} URL{urls.length === 1 ? '' : 's'}
      </summary>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 6,
          padding: '10px 12px',
          background: '#fff',
          border: '1px solid var(--theme-elevation-200, #ddd)',
          borderRadius: 6,
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          minWidth: 320,
          maxWidth: 480,
          zIndex: 10,
          textAlign: 'left',
        }}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {urls.map((u, i) => (
            <li key={u + i}>
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className={isOurUrl(u) ? 'llm-source-link is-ours' : 'llm-source-link'}
              >
                {isOurUrl(u) ? '★ ' : ''}
                {displayUrl(u)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

/**
 * Render the relevant excerpt for a single platform's response, plus the
 * cited URL list (if any) as clickable links. Highlights our domain.
 *
 * Falls back gracefully for legacy snapshots where citedUrls wasn't stored:
 * extracts URLs from the snippet text via regex.
 */
const URL_RE = /https?:\/\/[^\s)]+/g

/**
 * Strip Perplexity-style citation markers (e.g. "...domain.[2][3][5]")
 * from prose so the excerpt reads cleanly. Also collapses whitespace and
 * trims trailing partial words from a hard-cut snippet.
 */
function cleanProse(text: string): string {
  let cleaned = text
    .replace(/\s*(\[\d+\])+/g, '') // strip [1] [2][3] etc
    .replace(/\s+/g, ' ')
    .trim()
  // If the snippet was cut mid-word (snippet extractor uses a fixed char
  // window), back up to the last space to avoid orphaned half-words like
  // "but key struct".
  if (cleaned.endsWith('...')) {
    const body = cleaned.slice(0, -3).trim()
    const lastSpace = body.lastIndexOf(' ')
    if (lastSpace > body.length * 0.7) {
      cleaned = body.slice(0, lastSpace) + '...'
    }
  }
  return cleaned
}

/**
 * Sort URLs so our own domain appears first (the most useful signal),
 * then preserve original order for the rest.
 */
function sortUrls(urls: string[]): string[] {
  return [...urls].sort((a, b) => {
    const ourA = isOurUrl(a)
    const ourB = isOurUrl(b)
    if (ourA && !ourB) return -1
    if (!ourA && ourB) return 1
    return 0
  })
}

const MentionSnippet: React.FC<{ label: string; snap: any }> = ({ label, snap }) => {
  const rawCitedUrls: string[] = Array.isArray(snap?.citedUrls) ? snap.citedUrls : []
  const snippet: string = snap?.responseSnippet ?? ''

  // For legacy data without citedUrls, pull URLs out of the snippet so we
  // don't render a wall of plain-text URLs.
  let proseSnippet = snippet
  let urls: string[] = rawCitedUrls
  if (urls.length === 0) {
    const found = snippet.match(URL_RE) ?? []
    if (found.length > 0) {
      urls = Array.from(new Set(found))
      proseSnippet = snippet.replace(URL_RE, '').replace(/\s+/g, ' ').trim()
    }
  }

  proseSnippet = cleanProse(proseSnippet)
  urls = sortUrls(urls)

  const displayUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '')

  const showProse = proseSnippet.length > 0 && proseSnippet !== '...'
  const showUrls = urls.length > 0

  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'rgba(22, 163, 74, 0.06)',
        borderRadius: 6,
        borderLeft: '2px solid #16a34a',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#fff',
            background: '#16a34a',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          {label}
        </span>
        {snap?.domainCited && (
          <span
            title={`${OUR_DOMAIN} was cited as a source`}
            style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#0f0f0f',
              background: '#FFC700',
              padding: '2px 6px',
              borderRadius: 3,
            }}
          >
            URL cited
          </span>
        )}
      </div>

      {showProse && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-800, #333)', lineHeight: 1.5 }}>
          {proseSnippet}
        </p>
      )}

      {showUrls && (
        <div style={{ marginTop: showProse ? 10 : 0 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--theme-elevation-500, #888)',
              marginBottom: 4,
            }}
          >
            Sources cited
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {urls.slice(0, 12).map((u, i) => {
              const ours = isOurUrl(u)
              return (
                <li key={u + i}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={ours ? 'llm-source-link is-ours' : 'llm-source-link'}
                  >
                    {ours ? '★ ' : ''}{displayUrl(u)}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function positionColor(pos: number): string {
  if (pos <= 3) return '#16a34a'
  if (pos <= 10) return '#65a30d'
  if (pos <= 30) return '#b45309'
  return '#6b7280'
}

const TabNav: React.FC<{ active: TabId }> = ({ active }) => {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'search', label: 'Search Console' },
    { id: 'traffic', label: 'Traffic' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'llm', label: 'LLM Mentions' },
  ]
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'var(--theme-elevation-50, #f3f3ee)',
        border: '1px solid var(--theme-elevation-100, #e5e5e0)',
        borderRadius: 10,
        marginBottom: 24,
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id
        const href = t.id === 'overview' ? '/admin/analytics/overview' : `/admin/analytics/overview?tab=${t.id}`
        return (
          <Link
            key={t.id}
            href={href}
            prefetch={false}
            style={{
              flex: '1 1 0',
              textAlign: 'center',
              padding: '10px 14px',
              background: isActive ? '#0f0f0f' : 'transparent',
              color: isActive ? '#FFC700' : 'var(--theme-elevation-700, #444)',
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 6,
              textDecoration: 'none',
              fontFamily: 'system-ui, sans-serif',
              whiteSpace: 'nowrap',
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

const PageHeader: React.FC = () => (
  <div
    style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      borderRadius: 12,
      padding: '32px 36px',
      marginBottom: 28,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse at top right, rgba(255, 199, 0, 0.15), transparent 60%)',
        pointerEvents: 'none',
      }}
    />
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: '#FFC700',
            color: '#111',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderRadius: 4,
          }}
        >
          Analytics
        </span>
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <span aria-hidden="true">←</span> Back to admin
        </Link>
      </div>
      <h1
        style={{
          margin: '0 0 6px',
          fontSize: 28,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.4px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        How the site is performing
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Last 30 days vs the prior 30 days. Pulled from Google Analytics and Search Console nightly.
      </p>
    </div>
  </div>
)

const SectionHeader: React.FC<{ title: string; subtitle: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3
        style={{
          margin: '0 0 2px',
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '-0.2px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: 'var(--theme-elevation-500, #888)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {subtitle}
      </p>
    </div>
    {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
  </div>
)

const ManageLinkButton: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <a
    href={href}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      background: '#0f0f0f',
      color: '#FFC700',
      border: '1px solid #0f0f0f',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      textDecoration: 'none',
      fontFamily: 'system-ui, sans-serif',
      whiteSpace: 'nowrap',
    }}
  >
    + {label}
  </a>
)

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
    {label}
  </span>
)

const EmptyTableNote: React.FC<{ text: string }> = ({ text }) => (
  <p style={{ margin: '8px 0', fontSize: 12, color: 'var(--theme-elevation-500, #888)' }}>{text}</p>
)
