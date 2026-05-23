'use client'
import React, { useMemo, useState } from 'react'
import { OUR_DOMAIN } from '@/lib/analytics-config'
import { brand, primaryAlpha } from '../../lib/brand'

export interface KeywordRowDFS {
  keyword: string
  position: number
  searchVolume: number
  url?: string
}

export type GapCategory = 'all' | 'shared' | 'missing' | 'weak' | 'strong' | 'untapped' | 'unique'

const GAP_CATEGORIES: Array<{ id: GapCategory; label: string; help: string }> = [
  { id: 'all', label: 'All', help: 'Every keyword in the comparison set.' },
  { id: 'shared', label: 'Shared', help: 'Keywords your site and at least one competitor both rank for.' },
  { id: 'missing', label: 'Missing', help: 'Keywords competitors rank for that you do not.' },
  { id: 'weak', label: 'Weak', help: 'Keywords you rank for but a competitor outranks you.' },
  { id: 'strong', label: 'Strong', help: 'Keywords you rank for in a better position than every competitor.' },
  { id: 'untapped', label: 'Untapped', help: 'Keywords no one ranks well for (everyone is page 4 or worse).' },
  { id: 'unique', label: 'Unique', help: 'Keywords only you rank for.' },
]

export interface GapAnalysisProps {
  ourKeywords: KeywordRowDFS[]
  competitors: Array<{
    domain: string
    keywords: KeywordRowDFS[]
    estimatedTraffic?: number
    rankedKeywordsCount?: number
    snapshotDate?: string
  }>
}

const cardStyle: React.CSSProperties = {
  padding: '20px 22px',
  border: '1px solid var(--theme-elevation-100, #e5e5e0)',
  borderRadius: 8,
  background: 'var(--theme-bg, #fdfdf7)',
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

function fmt(n: number): string {
  return n.toLocaleString()
}

function positionColor(pos: number): string {
  if (pos <= 3) return '#16a34a'
  if (pos <= 10) return '#65a30d'
  if (pos <= 30) return '#b45309'
  return '#6b7280'
}

const GapAnalysis: React.FC<GapAnalysisProps> = ({ ourKeywords, competitors }) => {
  const [filter, setFilter] = useState<GapCategory>('all')

  // Cap visible competitors at top 5 by ranked-keyword count.
  const displayedComps = useMemo(
    () =>
      [...competitors]
        .sort((a, b) => b.keywords.length - a.keywords.length)
        .slice(0, 5),
    [competitors],
  )

  // Build keyword × brand position lookup
  const { allRows, categoryCounts } = useMemo(() => {
    const ourPositions = new Map<string, KeywordRowDFS>()
    ourKeywords.forEach((k) => ourPositions.set(k.keyword.toLowerCase(), k))

    const compPositions = new Map<string, Map<string, KeywordRowDFS>>()
    for (const c of displayedComps) {
      const m = new Map<string, KeywordRowDFS>()
      c.keywords.forEach((k) => m.set(k.keyword.toLowerCase(), k))
      compPositions.set(c.domain, m)
    }

    // Universe = union of all keywords across us + displayed competitors
    const universe = new Map<string, { keyword: string; searchVolume: number }>()
    for (const k of ourKeywords) {
      universe.set(k.keyword.toLowerCase(), { keyword: k.keyword, searchVolume: k.searchVolume })
    }
    for (const c of displayedComps) {
      for (const k of c.keywords) {
        const key = k.keyword.toLowerCase()
        const cur = universe.get(key)
        if (!cur || k.searchVolume > cur.searchVolume) {
          universe.set(key, { keyword: k.keyword, searchVolume: k.searchVolume })
        }
      }
    }

    function categorize(keywordKey: string): GapCategory {
      const ours = ourPositions.get(keywordKey)
      const compHits: number[] = []
      for (const m of compPositions.values()) {
        const c = m.get(keywordKey)
        if (c?.position) compHits.push(c.position)
      }

      const weRank = !!ours?.position
      const anyCompRanks = compHits.length > 0

      if (!weRank && !anyCompRanks) return 'untapped'
      if (weRank && !anyCompRanks) return 'unique'
      if (!weRank && anyCompRanks) return 'missing'
      const ourPos = ours!.position
      const bestComp = Math.min(...compHits)
      if (ourPos < bestComp) return 'strong'
      if (ourPos > bestComp) return 'weak'
      return 'strong'
    }

    const allRows = Array.from(universe.entries()).map(([key, info]) => {
      const category = categorize(key)
      const ours = ourPositions.get(key)
      const compRow: Record<string, KeywordRowDFS | undefined> = {}
      let brandsRanking = ours?.position ? 1 : 0
      for (const c of displayedComps) {
        const cell = compPositions.get(c.domain)?.get(key)
        compRow[c.domain] = cell
        if (cell?.position) brandsRanking++
      }
      return {
        keyword: info.keyword,
        searchVolume: info.searchVolume,
        category,
        our: ours,
        comps: compRow,
        brandsRanking,
      }
    })

    const categoryCounts: Record<GapCategory, number> = {
      all: allRows.length,
      shared: allRows.filter((r) => r.category === 'strong' || r.category === 'weak').length,
      missing: allRows.filter((r) => r.category === 'missing').length,
      weak: allRows.filter((r) => r.category === 'weak').length,
      strong: allRows.filter((r) => r.category === 'strong').length,
      untapped: allRows.filter((r) => r.category === 'untapped').length,
      unique: allRows.filter((r) => r.category === 'unique').length,
    }

    return { allRows, categoryCounts }
  }, [ourKeywords, displayedComps])

  const filteredRows = useMemo(() => {
    return allRows
      .filter((r) => {
        if (filter === 'all') return true
        if (filter === 'shared') return r.category === 'strong' || r.category === 'weak'
        return r.category === filter
      })
      // Sort by # of brands ranking (desc) so multi-brand keywords surface
      // first; that is where real competitive overlap lives. Tie-break by
      // search volume so within the same coverage tier, biggest is first.
      .sort((a, b) => {
        if (b.brandsRanking !== a.brandsRanking) return b.brandsRanking - a.brandsRanking
        return b.searchVolume - a.searchVolume
      })
  }, [allRows, filter])

  const totalBrands = displayedComps.length + 1 // competitors + us

  const positionCellStyle = (pos?: number): React.CSSProperties => {
    if (!pos) {
      return {
        ...cellStyle,
        textAlign: 'center',
        color: 'var(--theme-elevation-300, #ccc)',
        fontSize: 12,
      }
    }
    return {
      ...cellStyle,
      textAlign: 'center',
      fontWeight: 700,
      color: positionColor(pos),
      background:
        pos <= 3 ? 'rgba(22, 163, 74, 0.12)' :
        pos <= 10 ? 'rgba(101, 163, 13, 0.10)' :
        pos <= 30 ? 'rgba(180, 83, 9, 0.08)' :
        'transparent',
    }
  }

  // SEMrush-style headline numbers — total opportunity, where you stand,
  // where the easy wins are. Computed from the same allRows the matrix uses.
  const headlineStats = useMemo(() => {
    const total = allRows.length
    const youRank = allRows.filter((r) => r.our?.position).length
    const shared = categoryCounts.shared
    const missing = categoryCounts.missing
    const unique = categoryCounts.unique
    const weak = categoryCounts.weak
    const strong = categoryCounts.strong
    return { total, youRank, shared, missing, unique, weak, strong }
  }, [allRows, categoryCounts])

  return (
    <>
      {/* Headline stats strip — SEMrush-style at-a-glance numbers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Total keywords', value: headlineStats.total, color: '#0f0f0f' },
          { label: 'You rank for', value: headlineStats.youRank, color: '#16a34a' },
          { label: 'Shared with comps', value: headlineStats.shared, color: '#0ea5e9' },
          { label: 'Missing (gap)', value: headlineStats.missing, color: '#dc2626' },
          { label: 'Only you rank', value: headlineStats.unique, color: '#a16207' },
        ].map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--theme-elevation-500, #888)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: s.color }}>
              {fmt(s.value)}
            </div>
          </div>
        ))}
      </div>

<div style={{ ...cardStyle, marginBottom: 28, padding: 0 }}>
        <div style={{ padding: '18px 20px 14px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px' }}>
            Keyword gap analysis
          </h2>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--theme-elevation-500, #888)', lineHeight: 1.5 }}>
            {`Compares every keyword ${OUR_DOMAIN} ranks for against each competitor's 30 highest-volume keywords where they actually rank in the top 30 of Google (so weak rankings don't clutter the view). Sorted by Coverage so keywords with the most overlap show first. Empty cells mean that brand does not rank for that keyword.`}
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--theme-elevation-500, #888)', lineHeight: 1.5, fontStyle: 'italic' }}>
            Tip: if Coverage is mostly 1/{displayedComps.length + 1} for every keyword, your competitors do not actually compete with you on the same terms. Pick competitors that target the same niche for a more useful gap analysis.
          </p>

          {/* Filter chips — chips with 0 results are disabled so clicking
              one never lands you on an empty matrix and never scrolls you
              away from your spot in the table. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {GAP_CATEGORIES.map(({ id, label, help }) => {
              const isActive = filter === id
              const count = categoryCounts[id]
              const isEmpty = count === 0 && !isActive
              return (
                <button
                  key={id}
                  type="button"
                  disabled={isEmpty}
                  onClick={() => { if (!isEmpty) setFilter(id) }}
                  title={isEmpty ? `No keywords in this category for the current data set.` : help}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: isActive
                      ? '#0f0f0f'
                      : isEmpty
                        ? 'var(--theme-elevation-50, #f5f5f0)'
                        : 'var(--theme-elevation-50, #f5f5f0)',
                    color: isActive
                      ? brand.primary
                      : isEmpty
                        ? 'var(--theme-elevation-300, #c4c4bf)'
                        : 'var(--theme-elevation-700, #444)',
                    border: '1px solid ' + (isActive
                      ? '#0f0f0f'
                      : isEmpty
                        ? 'var(--theme-elevation-100, #ececea)'
                        : 'var(--theme-elevation-100, #e5e5e0)'),
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: isEmpty ? 'not-allowed' : 'pointer',
                    opacity: isEmpty ? 0.45 : 1,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 8,
                      background: isActive ? `rgba(${brand.primaryRgb}, 0.18)` : 'var(--theme-elevation-100, #eee)',
                      color: isActive ? brand.primary : 'var(--theme-elevation-600, #666)',
                    }}
                  >
                    {fmt(count)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Matrix table */}
        {filteredRows.length === 0 ? (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--theme-elevation-500, #888)' }}>
            No keywords match this filter for the current data set.
          </div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 640 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--theme-bg, #fff)', zIndex: 1 }}>
                <tr>
                  <th style={{ ...headerCellStyle, textAlign: 'left', minWidth: 240 }}>Keyword</th>
                  <th style={{ ...headerCellStyle, textAlign: 'right', width: 90 }}>Volume</th>
                  <th
                    style={{ ...headerCellStyle, textAlign: 'center', width: 90 }}
                    title="How many of the brands in this matrix rank for this keyword"
                  >
                    Coverage
                  </th>
                  <th style={{ ...headerCellStyle, textAlign: 'center', minWidth: 100, background: `rgba(${brand.primaryRgb}, 0.18)` }}>
                    ★ {OUR_DOMAIN}
                  </th>
                  {displayedComps.map((c) => (
                    <th key={c.domain} style={{ ...headerCellStyle, textAlign: 'center', minWidth: 110 }}>
                      {c.domain}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((row, idx) => (
                  <tr key={row.keyword + idx}>
                    <td style={{ ...cellStyle, fontWeight: 500 }}>{row.keyword}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', color: 'var(--theme-elevation-600, #666)' }}>
                      {fmt(row.searchVolume)}
                    </td>
                    <td style={{
                      ...cellStyle,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: row.brandsRanking >= 3 ? '#16a34a'
                        : row.brandsRanking === 2 ? '#65a30d'
                        : '#888',
                    }}>
                      {row.brandsRanking}/{totalBrands}
                    </td>
                    <td style={{ ...positionCellStyle(row.our?.position), background: row.our?.position
                      ? (row.our.position <= 3 ? 'rgba(22, 163, 74, 0.18)'
                        : row.our.position <= 10 ? 'rgba(101, 163, 13, 0.14)'
                        : row.our.position <= 30 ? 'rgba(180, 83, 9, 0.12)'
                        : `rgba(${brand.primaryRgb}, 0.08)`)
                      : primaryAlpha(0.04) }}>
                      {row.our?.position ?? '—'}
                    </td>
                    {displayedComps.map((c) => {
                      const cell = row.comps[c.domain]
                      return (
                        <td key={c.domain} style={positionCellStyle(cell?.position)}>
                          {cell?.position ?? '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length > 200 && (
              <div style={{ padding: '10px 20px', fontSize: 11, color: 'var(--theme-elevation-500, #888)', borderTop: '1px solid var(--theme-elevation-100, #eee)' }}>
                Showing top 200 of {fmt(filteredRows.length)} keywords by search volume.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default GapAnalysis
