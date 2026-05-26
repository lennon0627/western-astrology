'use client'

import { useMemo } from 'react'
import { PLANET_SYMBOLS } from '@/lib/astro'
import type { RetroPeriod } from '@/lib/types'

const RETRO_PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

const PLANET_VAR: Record<string, string> = {
  Mercury: 'var(--planet-mercury)',
  Venus:   'var(--planet-venus)',
  Mars:    'var(--planet-mars)',
  Jupiter: 'var(--planet-jupiter)',
  Saturn:  'var(--planet-saturn)',
  Uranus:  'var(--planet-uranus)',
  Neptune: 'var(--planet-neptune)',
  Pluto:   'var(--planet-pluto)',
}

interface Props {
  periods: RetroPeriod[]
}

export default function RetrogradePeriods({ periods }: Props) {
  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  const endDate = useMemo(() => {
    const d = new Date(today); d.setFullYear(d.getFullYear() + 1); return d
  }, [today])

  const totalMs = endDate.getTime() - today.getTime()

  // X軸ラベル（月初め）
  const monthLabels = useMemo(() => {
    const labels: { label: string; pct: number }[] = []
    for (let i = 0; i <= 12; i++) {
      const d = new Date(today)
      d.setDate(1)
      d.setMonth(d.getMonth() + i)
      const pct = (d.getTime() - today.getTime()) / totalMs * 100
      if (pct >= 0 && pct <= 100)
        labels.push({ label: `${d.getMonth() + 1}月`, pct })
    }
    return labels
  }, [today, totalMs])

  // 今日マーカーの位置（常に 0%）

  function toBar(period: RetroPeriod) {
    const s = Math.max(new Date(period.start).getTime(), today.getTime())
    const e = Math.min(new Date(period.end).getTime(), endDate.getTime())
    if (e <= s) return null
    const leftPct  = (s - today.getTime()) / totalMs * 100
    const widthPct = (e - s) / totalMs * 100
    return { leftPct, widthPct }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">逆行期間（今後1年）</p>

      {/* X軸ラベル */}
      <div className="relative h-4 ml-20">
        {monthLabels.map(({ label, pct }) => (
          <span
            key={label}
            className="absolute text-[9px] text-muted-foreground/60 -translate-x-1/2"
            style={{ left: `${pct}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* 惑星行 */}
      {RETRO_PLANETS.map(planet => {
        const color = PLANET_VAR[planet]
        const planetPeriods = periods.filter(p => p.planet === planet)

        return (
          <div key={planet} className="flex items-center gap-2">
            {/* 惑星名ラベル */}
            <div
              className="w-20 shrink-0 text-right text-[11px] font-medium"
              style={{ color }}
            >
              {PLANET_SYMBOLS[planet]} {planet}
            </div>

            {/* タイムラインバー */}
            <div className="relative flex-1 h-3 rounded-sm bg-muted/20">
              {/* 今日マーカー */}
              <div className="absolute top-0 bottom-0 w-px bg-primary/40" style={{ left: '0%' }} />

              {planetPeriods.length === 0 ? (
                <span className="absolute inset-0 flex items-center pl-1 text-[9px] text-muted-foreground/30">
                  逆行なし
                </span>
              ) : (
                planetPeriods.map((period, i) => {
                  const bar = toBar(period)
                  if (!bar) return null
                  return (
                    <div
                      key={i}
                      className="absolute top-0.5 h-2 rounded-sm opacity-75"
                      style={{
                        left:            `${bar.leftPct}%`,
                        width:           `${bar.widthPct}%`,
                        backgroundColor: color,
                      }}
                      title={`${planet} 逆行: ${period.start.slice(0, 10)} 〜 ${period.end.slice(0, 10)}`}
                    />
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
