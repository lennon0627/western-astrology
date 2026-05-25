'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import TransitChart from '@/components/TransitChart'
import type { TransitEvent } from '@/lib/types'

const FILTERS = ['全て', 'ハード', 'ソフト', '重要'] as const
type Filter = typeof FILTERS[number]

export default function TransitCalendar({ events }: { events: TransitEvent[] }) {
  const [filter, setFilter] = useState<Filter>('全て')

  const filtered = events.filter(e => {
    if (filter === 'ハード') return e.type === 'ハード'
    if (filter === 'ソフト') return e.type === 'ソフト'
    if (filter === '重要')  return e.score >= 10
    return true
  })

  return (
    <div className="space-y-3">
      <TransitChart events={events} />

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
