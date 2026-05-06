'use client'
import React from 'react'
import { useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'

const SITE_URL = 'https://example.com'

const AuthorPublishButton: SelectFieldClientComponent = ({ path }) => {
  const { value, setValue } = useField<string>({ path: path ?? 'status' })
  const { value: slug } = useField<string>({ path: 'slug' })
  const isDraft = value !== 'published'

  // TODO (per-client): if the public route is something other than /author/<slug>
  // (e.g. /team/, /chapter-members/), update this URL pattern to match.
  const liveUrl = slug ? `${SITE_URL}/author/${slug}` : null
  const previewUrl = liveUrl ? `${liveUrl}?preview=1` : null

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.7rem',
          fontWeight: 700,
          marginBottom: '0.6rem',
          color: 'var(--theme-elevation-500, #888)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Status
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          padding: '6px 10px',
          borderRadius: 6,
          background: isDraft ? 'var(--theme-elevation-100, #f5f5f0)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${isDraft ? 'var(--theme-elevation-200, #e5e5e0)' : 'rgba(34,197,94,0.3)'}`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isDraft ? '#aaa' : '#22c55e',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: isDraft ? 'var(--theme-elevation-600, #666)' : '#16a34a',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {isDraft ? 'Draft' : 'Live'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setValue(isDraft ? 'published' : 'draft')}
        style={{
          width: '100%',
          padding: '0.65rem 1rem',
          border: isDraft ? 'none' : '1px solid var(--theme-elevation-200, #ddd)',
          borderRadius: 8,
          fontWeight: 800,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: isDraft ? '#111' : 'transparent',
          color: isDraft ? '#fff' : 'var(--theme-elevation-500, #888)',
        }}
      >
        {isDraft ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Publish Now
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            Revert to Draft
          </>
        )}
      </button>

      {previewUrl && (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            marginTop: 8,
            padding: '0.55rem 1rem',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--theme-elevation-700, #4a4a48)',
            border: '1px solid var(--theme-elevation-200, #dbd0c8)',
            fontWeight: 700,
            fontSize: '0.78rem',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transition: 'opacity 0.2s',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview
        </a>
      )}

      {!isDraft && liveUrl && (
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            marginTop: 8,
            padding: '0.6rem 1rem',
            borderRadius: 8,
            background: '#ffc700',
            color: '#111',
            fontWeight: 800,
            fontSize: '0.8rem',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            transition: 'opacity 0.2s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View Live Author Page
        </a>
      )}
    </div>
  )
}

export default AuthorPublishButton
