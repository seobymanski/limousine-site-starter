'use client'
import React from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { brand, primaryAlpha } from '../../lib/brand'

export interface TrendDatum {
  /** ISO date YYYY-MM-DD; rendered as e.g. "Apr 12" on the x-axis. */
  date: string
  [series: string]: number | string
}

interface TrendLineChartProps {
  data: TrendDatum[]
  /** One entry per line. Series keys must exist on each datum. */
  series: Array<{ key: string; label: string; color: string }>
  height?: number
  /** Optional custom Y-axis formatter (e.g. percentages). */
  yFormatter?: (value: number) => string
  /** "day" (default) shows e.g. "Apr 12"; "month" shows "Apr 2026". */
  dateGranularity?: 'day' | 'month'
}

function formatDateTick(iso: string, granularity: 'day' | 'month' = 'day'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  if (granularity === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  series,
  height = 240,
  yFormatter,
  dateGranularity = 'day',
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDateTick(d, dateGranularity)}
          tick={{ fontSize: 11, fill: '#888' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
        />
        <YAxis
          tickFormatter={yFormatter}
          tick={{ fontSize: 11, fill: '#888' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: '#111',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            color: '#fff',
          }}
          labelStyle={{ color: brand.primary, fontWeight: 700 }}
          labelFormatter={(label) => formatDateTick(String(label), dateGranularity)}
          formatter={yFormatter ? ((val: any) => yFormatter(Number(val))) as any : undefined}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            name={s.label}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default TrendLineChart
