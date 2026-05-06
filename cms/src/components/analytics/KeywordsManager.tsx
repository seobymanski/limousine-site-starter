'use client'
import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEFAULT_LOCATION } from '@/lib/analytics-config'

interface KeywordRow {
  id: number
  keyword: string
  location: string
  active: boolean
  notes?: string | null
}

interface Props {
  initialRows: KeywordRow[]
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid var(--theme-elevation-200, #ddd)',
  background: 'var(--theme-input-bg, #fff)',
  color: 'var(--theme-text, #111)',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  padding: '9px 18px',
  background: '#FFC700',
  color: '#111',
  fontWeight: 800,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderRadius: 6,
  border: 0,
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
}

const cellStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  borderBottom: '1px solid var(--theme-elevation-100, #eee)',
  color: 'var(--theme-text, #111)',
}

const headerCellStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--theme-elevation-500, #888)',
  textAlign: 'left',
  borderBottom: '1px solid var(--theme-elevation-200, #ddd)',
  background: 'var(--theme-elevation-50, #fafaf5)',
}

const KeywordsManager: React.FC<Props> = ({ initialRows }) => {
  const router = useRouter()
  const [rows, setRows] = useState<KeywordRow[]>(initialRows)
  const [bulkText, setBulkText] = useState('')
  const [bulkLocation, setBulkLocation] = useState(DEFAULT_LOCATION)
  const [busy, setBusy] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const refresh = () => startTransition(() => router.refresh())

  const runAnalysis = async () => {
    if (analyzing) return
    setAnalyzing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/analytics/run/dataforseo', { method: 'POST' })
      const data = (await res.json()) as {
        error?: string
        keywordRankings?: { written?: number }
      }
      if (!res.ok) throw new Error(data.error ?? 'failed')
      const written = data.keywordRankings?.written ?? 0
      setMessage({
        type: 'ok',
        text: `Analysis complete: ${written} keyword ranking${written === 1 ? '' : 's'} updated. Refresh the Overview to see deltas.`,
      })
      refresh()
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message ?? 'Analysis failed.' })
    } finally {
      setAnalyzing(false)
    }
  }

  const submitBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    const keywords = bulkText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (keywords.length === 0) {
      setMessage({ type: 'err', text: 'Enter at least one keyword.' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/analytics/keywords/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keywords, location: bulkLocation }),
      })
      const data = (await res.json()) as {
        error?: string
        created?: number
        skipped?: number
        createdDocs?: KeywordRow[]
      }
      if (!res.ok) throw new Error(data.error ?? 'failed')
      setBulkText('')
      const created = data.created ?? 0
      const skipped = data.skipped ?? 0
      const dupePart = skipped > 0 ? ` (${skipped} duplicate skipped)` : ''
      setMessage({ type: 'ok', text: `Added ${created} keyword${created === 1 ? '' : 's'}${dupePart}.` })
      // Append new rows to local state so they appear immediately, then sort
      // by keyword to match the server-side order on next refresh.
      if (data.createdDocs && data.createdDocs.length > 0) {
        setRows((rs) =>
          [...rs, ...data.createdDocs!].sort((a, b) => a.keyword.localeCompare(b.keyword)),
        )
      }
      refresh()
    } catch (err: any) {
      setMessage({ type: 'err', text: err?.message ?? 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (row: KeywordRow) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)))
    try {
      await fetch(`/api/analytics/keywords/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: !row.active }),
      })
    } catch {
      // revert on failure
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, active: row.active } : r)))
    }
  }

  const remove = async (row: KeywordRow) => {
    if (!confirm(`Remove "${row.keyword}" from tracked keywords?`)) return
    setRows((rs) => rs.filter((r) => r.id !== row.id))
    try {
      await fetch(`/api/analytics/keywords/${row.id}`, { method: 'DELETE' })
    } catch {
      // Best-effort optimistic; if it fails the next refresh will restore
      refresh()
    }
  }

  const activeCount = rows.filter((r) => r.active).length

  return (
    <div>
      {/* Bulk add form */}
      <form
        onSubmit={submitBulk}
        style={{
          padding: '22px 24px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          color: '#fafaf5',
          borderRadius: 10,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
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
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.2px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Add keywords
          </h2>
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            One per line, or comma-separated. Duplicates are skipped automatically.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'best running shoes\nrunning shoes for flat feet\nzero drop running shoes'}
            rows={5}
            style={{
              ...inputStyle,
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)',
              fontFamily: 'system-ui, sans-serif',
              resize: 'vertical',
              minHeight: 100,
            }}
            disabled={busy}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Location
              <input
                type="text"
                value={bulkLocation}
                onChange={(e) => setBulkLocation(e.target.value)}
                style={{
                  ...inputStyle,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  marginTop: 6,
                  width: 240,
                }}
                disabled={busy}
              />
            </label>
            <button type="submit" style={{ ...buttonStyle, opacity: busy ? 0.6 : 1 }} disabled={busy}>
              {busy ? 'Adding...' : 'Add to tracked'}
            </button>
            {message && (
              <span
                style={{
                  fontSize: 12,
                  color: message.type === 'ok' ? '#86efac' : '#fca5a5',
                  fontWeight: 600,
                }}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Table of existing keywords */}
      <div
        style={{
          border: '1px solid var(--theme-elevation-100, #e5e5e0)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--theme-bg, #fff)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--theme-elevation-100, #eee)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px' }}>
              Tracked keywords
            </h3>
            <span style={{ fontSize: 11, color: 'var(--theme-elevation-500, #888)' }}>
              {rows.length} total · {activeCount} active
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/admin/analytics/overview?tab=rankings"
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: 'var(--theme-elevation-700, #444)',
                border: '1px solid var(--theme-elevation-200, #ccc)',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textDecoration: 'none',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              View analysis →
            </Link>
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing || activeCount === 0}
              title="Pulls our domain profile from DataForSEO and refreshes ranking position for every active tracked keyword."
              style={{
                padding: '8px 14px',
                background: analyzing ? 'var(--theme-elevation-200, #ccc)' : '#0f0f0f',
                color: analyzing ? '#666' : '#FFC700',
                border: '1px solid #0f0f0f',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: analyzing || activeCount === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'system-ui, sans-serif',
                opacity: activeCount === 0 ? 0.5 : 1,
              }}
            >
              {analyzing ? 'Analyzing...' : 'Run analysis now'}
            </button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p style={{ padding: '24px 18px', margin: 0, fontSize: 13, color: 'var(--theme-elevation-500, #888)' }}>
            No keywords yet. Add some above to start tracking weekly rankings.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>Keyword</th>
                <th style={headerCellStyle}>Location</th>
                <th style={{ ...headerCellStyle, textAlign: 'center', width: 90 }}>Active</th>
                <th style={{ ...headerCellStyle, textAlign: 'right', width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{row.keyword}</td>
                  <td style={{ ...cellStyle, color: 'var(--theme-elevation-600, #666)' }}>{row.location}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      title={row.active ? 'Active — click to pause' : 'Paused — click to activate'}
                      style={{
                        background: row.active ? '#16a34a' : 'var(--theme-elevation-200, #ccc)',
                        color: '#fff',
                        border: 0,
                        borderRadius: 12,
                        width: 36,
                        height: 20,
                        position: 'relative',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: row.active ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 120ms ease',
                        }}
                      />
                    </button>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      style={{
                        background: 'transparent',
                        color: '#dc2626',
                        border: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default KeywordsManager
