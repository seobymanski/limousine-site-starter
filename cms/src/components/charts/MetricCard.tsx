import React from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  /** Previous-period value, used to compute the delta percentage. */
  previousValue?: number
  /** When true, a higher number is good (default). Set false for things like "average position" where lower is better. */
  higherIsBetter?: boolean
  /** Short qualifier shown under the value, e.g. "last 30 days". */
  hint?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  previousValue,
  higherIsBetter = true,
  hint,
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value)
  const hasDelta =
    previousValue !== undefined && previousValue !== null && previousValue !== 0 && Number.isFinite(numericValue)
  const deltaPct = hasDelta ? ((numericValue - previousValue!) / previousValue!) * 100 : 0
  const positiveDelta = higherIsBetter ? deltaPct >= 0 : deltaPct <= 0
  const deltaColor = !hasDelta ? '#888' : positiveDelta ? '#16a34a' : '#dc2626'
  const deltaPrefix = deltaPct > 0 ? '+' : ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 18px',
        border: '1px solid var(--theme-elevation-100, #e5e5e0)',
        borderRadius: 6,
        background: 'transparent',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--theme-elevation-500, #888)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: 'var(--theme-elevation-900, #111)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginTop: 6 }}>
        {hasDelta && (
          <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor }}>
            {deltaPrefix}
            {deltaPct.toFixed(1)}%
          </span>
        )}
        {hint && (
          <span style={{ fontSize: 11, color: 'var(--theme-elevation-500, #888)' }}>{hint}</span>
        )}
      </div>
    </div>
  )
}

export default MetricCard
