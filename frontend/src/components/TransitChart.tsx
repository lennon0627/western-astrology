'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { TransitEvent } from '@/lib/types'

export default function TransitChart({ events }: { events: TransitEvent[] }) {
  const monthMap: Record<string, { month: string; ハード: number; ソフト: number }> = {}

  for (const e of events) {
    const d = new Date(e.exact_dt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}月`
    if (!monthMap[key]) monthMap[key] = { month: label, ハード: 0, ソフト: 0 }
    if (e.type === 'ハード') monthMap[key].ハード++
    else if (e.type === 'ソフト') monthMap[key].ソフト++
  }

  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

  return (
    <div className="mb-4">
      <p className="text-xs text-muted-foreground mb-2">月別トランジット件数</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 4, bottom: 0, left: -24 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--muted-foreground)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="ハード" stackId="a" fill="var(--aspect-square)"   radius={[0, 0, 0, 0]} />
          <Bar dataKey="ソフト" stackId="a" fill="var(--aspect-trine)"    radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
