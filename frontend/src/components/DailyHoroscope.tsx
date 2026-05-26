'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TransitEvent } from '@/lib/types'

interface Props {
  events: TransitEvent[]
}

function formatDate(dt: string) {
  const d = new Date(dt)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function DailyHoroscope({ events }: Props) {
  const weekEvents = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekLater = new Date(today)
    weekLater.setDate(today.getDate() + 7)
    return events
      .filter(e => { const dt = new Date(e.exact_dt); return dt >= today && dt <= weekLater })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [events])

  if (weekEvents.length === 0) return null

  return (
    <div className="w-full max-w-5xl mx-auto mb-6">
      <p className="text-xs text-muted-foreground mb-2 font-medium">✦ 今週の注目イベント（7日以内）</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {weekEvents.map((ev, i) => (
          <Card key={i} className={ev.type === 'hard' ? 'border-destructive/40' : 'border-green-600/40'}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(ev.exact_dt)}</span>
                <Badge
                  variant="outline"
                  className={ev.type === 'hard'
                    ? 'border-destructive text-destructive text-[10px] px-1.5'
                    : 'border-green-600 text-green-600 text-[10px] px-1.5'}
                >
                  {ev.type === 'hard' ? 'ハード' : 'ソフト'}
                </Badge>
              </div>
              <p className="text-sm font-medium leading-tight">
                {ev.transit_planet_jp} {ev.aspect_jp} {ev.natal_planet_jp}
              </p>
              <p className="text-xs text-muted-foreground leading-snug">{ev.label}</p>
              {ev.special && <p className="text-[10px] text-amber-500">★ {ev.special}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
