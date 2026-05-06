import React from 'react'

interface Props {
  source: string
}

const EmptyAnalyticsState: React.FC<Props> = ({ source }) => (
  <div
    style={{
      padding: '40px 32px',
      textAlign: 'center',
      border: '1px dashed var(--theme-elevation-200, #ddd)',
      borderRadius: 8,
      color: 'var(--theme-elevation-600, #666)',
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: 'var(--theme-elevation-900, #111)' }}>
      No {source} data yet
    </h3>
    <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5 }}>
      Once the nightly cron runs (or you trigger it manually) snapshots will land in D1 and trends will appear here.
    </p>
    <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-elevation-500, #888)' }}>
      To backfill 14 days now, an admin can POST to <code>/api/analytics/run/google</code> with body{' '}
      <code>{`{ "backfill": 14 }`}</code> from the browser DevTools console while logged in.
    </p>
  </div>
)

export default EmptyAnalyticsState
