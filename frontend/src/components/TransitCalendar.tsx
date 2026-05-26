'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import TransitChart from '@/components/TransitChart'
import RetrogradePeriods from '@/components/RetrogradePeriods'
import type { ChartResponse, TransitEvent, RetroPeriod } from '@/lib/types'

const FILTERS = ['全て', 'ハード', 'ソフト', '重要'] as const
type Filter = typeof FILTERS[number]

function formatAlertDate(dt: string) {
  const d = new Date(dt)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function AlertSection({ events }: { events: TransitEvent[] }) {
  const alerts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const limit = new Date(today); limit.setDate(today.getDate() + 30)
    return events
      .filter(e => {
        const dt = new Date(e.exact_dt)
        return dt >= today && dt <= limit && e.special !== ''
      })
      .sort((a, b) => new Date(a.exact_dt).getTime() - new Date(b.exact_dt).getTime())
      .slice(0, 5)
  }, [events])

  if (alerts.length === 0) return null

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
      <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
        ⚡ 今後30日以内の重要イベント
      </p>
      <div className="space-y-1.5">
        {alerts.map((e, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm border ${
              e.type === 'ハード'
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-blue-500/30 bg-blue-500/5'
            }`}
          >
            {/* 日付 */}
            <span className="text-xs font-mono text-muted-foreground shrink-0 w-16 pt-0.5">
              {formatAlertDate(e.exact_dt)}
            </span>

            {/* 天体・アスペクト */}
            <div className="flex items-center gap-1 shrink-0">
              <span className={`font-bold text-base ${planetClass(e.transit_planet)}`}>
                {PLANET_SYMBOLS[e.transit_planet] ?? e.transit_planet}
              </span>
              <span className={`text-xs ${aspectClass(e.aspect)}`}>{e.aspect_jp}</span>
              <span className={`font-bold text-base ${planetClass(e.natal_planet)}`}>
                {PLANET_SYMBOLS[e.natal_planet] ?? e.natal_planet}
              </span>
            </div>

            {/* special 説明 */}
            <span className="text-xs text-foreground flex-1 leading-snug">
              ★ {e.special}
            </span>

            <Badge
              variant="outline"
              className={`text-[10px] px-1 shrink-0 ${
                e.type === 'ハード' ? 'border-destructive/50 text-destructive' : 'border-blue-500/50 text-blue-500'
              }`}
            >
              {e.type}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TransitCalendar({
  events, natal, currentPlanets, retroPeriods,
}: {
  events: TransitEvent[]
  natal: ChartResponse
  currentPlanets?: Record<string, number>
  retroPeriods?: RetroPeriod[]
}) {
  const [filter, setFilter] = useState<Filter>('全て')

  const filtered = events.filter(e => {
    if (filter === 'ハード') return e.type === 'ハード'
    if (filter === 'ソフト') return e.type === 'ソフト'
    if (filter === '重要')  return e.score >= 10
    return true
  })

  return (
    <div className="space-y-3">
      <AlertSection events={events} />

      <TransitChart events={events} natal={natal} currentPlanets={currentPlanets} />

      {retroPeriods && retroPeriods.length > 0 && (
        <RetrogradePeriods periods={retroPeriods} />
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} 件</span>
      </div>

      <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
        {filtered.map((e, i) => {
          const dt = new Date(e.exact_dt)
          const dateStr = `${dt.getMonth() + 1}/${dt.getDate()}`
          const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
          const isImportant = e.score >= 12

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm
                ${isImportant ? 'bg-yellow-500/10 border border-yellow-500/20' : 'hover:bg-muted/30'}`}
            >
              <div className="w-14 shrink-0 text-xs text-muted-foreground font-mono">
                <div>{dateStr}</div>
                <div className="opacity-60">{timeStr}</div>
              </div>

              <span className={`font-bold text-base shrink-0 ${planetClass(e.transit_planet)}`}>
                {PLANET_SYMBOLS[e.transit_planet] ?? e.transit_planet}
              </span>
              <span className={`text-xs shrink-0 ${aspectClass(e.aspect)}`}>
                {e.aspect_jp}
              </span>
              <span className={`font-bold text-base shrink-0 ${planetClass(e.natal_planet)}`}>
                {PLANET_SYMBOLS[e.natal_planet] ?? e.natal_planet}
              </span>

              <span className="text-xs text-muted-foreground flex-1 truncate">
                {e.transit_planet_jp} → {e.natal_planet_jp}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                {e.special && <span className="text-yellow-400 text-xs">★</span>}
                <Badge variant="outline" className={`text-xs px-1 ${
                  e.type === 'ハード' ? 'border-red-500/40 text-red-400' :
                  e.type === 'ソフト' ? 'border-blue-500/40 text-blue-400' :
                  'border-border text-muted-foreground'
                }`}>
                  {e.type}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
