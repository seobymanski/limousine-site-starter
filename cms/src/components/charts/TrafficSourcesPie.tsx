'use client'
import React from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { brand, primaryAlpha } from '../../lib/brand'

export interface TrafficSourceDatum {
  name: string
  value: number
}

interface Props {
  data: TrafficSourceDatum[]
  height?: number
}

// Brand-aligned palette: yellow lead, then deepening neutrals + accents.
// Falls back to gray for very long lists.
const COLORS = [
  brand.primary,
  '#0f0f0f',
  '#16a34a',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#6b7280',
]

const TrafficSourcesPie: React.FC<Props> = ({ data, height = 240 }) => {
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  if (total === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--theme-elevation-500, #888)',
          fontSize: 12,
        }}
      >
        No traffic data yet.
      </div>
    )
  }

  // Group anything past the 7th biggest source into "Other" so the chart
  // stays readable on a small surface.
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, 7)
  const restSum = sorted.slice(7).reduce((s, d) => s + d.value, 0)
  const finalData = restSum > 0 ? [...top, { name: 'Other', value: restSum }] : top

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: '0 0 auto', width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={finalData}
              dataKey="value"
              nameKey="name"
              innerRadius={Math.round(height * 0.28)}
              outerRadius={Math.round(height * 0.45)}
              paddingAngle={2}
              stroke="none"
            >
              {finalData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#111',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                color: '#fff',
              }}
              labelStyle={{ color: brand.primary, fontWeight: 700 }}
              formatter={(value: any, name: any) => {
                const v = Number(value)
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0'
                return [`${v.toLocaleString()} (${pct}%)`, name as string]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 0 }}>
        {finalData.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
          return (
            <li
              key={d.name + i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                fontSize: 12,
                color: 'var(--theme-elevation-700, #444)',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: COLORS[i % COLORS.length],
                }}
              />
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.name}
              </span>
              <span style={{ flex: '0 0 auto', fontWeight: 700, color: 'var(--theme-text, #111)' }}>
                {d.value.toLocaleString()}
              </span>
              <span style={{ flex: '0 0 auto', fontSize: 11, color: 'var(--theme-elevation-500, #888)' }}>
                {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default TrafficSourcesPie
