'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  lonToXY,
  PLANET_SYMBOLS, PLANET_COLORS, ASPECT_COLORS,
  ZODIAC_SYMBOLS, SIGN_ELEMENTS, ELEMENT_COLORS, ELEMENT_TEXT,
} from '@/lib/astro'
import type { ChartResponse, TransitEvent } from '@/lib/types'

const CX = 200, CY = 200

const R_OUTER   = 185   // 黄道帯外縁
const R_SIGN    = 154   // 黄道帯内縁
const R_T       = 133   // トランジット天体
const R_DIVIDER = 114   // T/N 境界線（破線）
const R_N       = 94    // ネイタル天体
const R_HOUSE   = 75    // ハウス内縁
const R_HLABEL  = 59    // ハウス番号
const R_ASPECT  = 43    // アスペクト線（中心）

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]

const TRANSIT_PLANETS = [
  'Sun','Moon','Mercury','Venus','Mars',
  'Jupiter','Saturn','Uranus','Neptune','Pluto',
]

/**
 * トランジット天体の黄経を upcoming events から逆算。
 * natal_planet.longitude ± asp_angle に transit_planet が存在するため、
 * 全イベントの候補をクラスタリングして最頻位置を返す。
 */
function estimateTransitLon(
  planet: string,
  events: TransitEvent[],
  natalPlanets: Record<string, { longitude: number }>,
): number | null {
  const evts = events.filter(e => e.transit_planet === planet)
  if (evts.length === 0) return null

  const candidates: number[] = []
  for (const e of evts) {
    const np = natalPlanets[e.natal_planet]
    if (!np) continue
    candidates.push((np.longitude + e.asp_angle + 360) % 360)
    candidates.push((np.longitude - e.asp_angle + 360) % 360)
  }
  if (candidates.length === 0) return null

  // 12°以内を同一クラスタとみなし、最も密集した位置の重心を返す
  let bestLon = candidates[0], bestScore = 0
  for (const c of candidates) {
    let score = 0, sum = 0, cnt = 0
    for (const d of candidates) {
      const diff = Math.abs(((c - d + 180) % 360) - 180)
      if (diff < 12) { score++; sum += d; cnt++ }
    }
    if (score > bestScore) { bestScore = score; bestLon = cnt > 0 ? sum / cnt : c }
  }
  return ((bestLon % 360) + 360) % 360
}

interface Props {
  natal: ChartResponse
  events: TransitEvent[]
  currentPlanets?: Record<string, number>  // API から渡される実位置（0〜360°）
}

export default function TransitChart({ natal, events, currentPlanets }: Props) {
  const asc = natal.houses.asc

  function pos(lon: number, r: number) {
    return lonToXY(lon, asc, r, CX, CY)
  }

  // トランジット天体位置: API 実位置 → 推定フォールバック
  const transitPositions = useMemo(() => {
    if (currentPlanets && Object.keys(currentPlanets).length > 0) {
      return TRANSIT_PLANETS
        .filter(name => name in currentPlanets)
        .map(name => ({ name, lon: currentPlanets[name] }))
    }
    // フォールバック: upcoming events から逆算推定
    const result: { name: string; lon: number }[] = []
    for (const planet of TRANSIT_PLANETS) {
      const lon = estimateTransitLon(planet, events, natal.planets)
      if (lon !== null) result.push({ name: planet, lon })
    }
    return result
  }, [currentPlanets, events, natal.planets])

  // 衝突回避（5°以内を5°ずらす）
  const transitDraw = useMemo(() => {
    const result: { name: string; lon: number; drawLon: number }[] = []
    for (const { name, lon } of transitPositions) {
      let drawLon = lon
      for (const prev of result) {
        const diff = Math.abs(((drawLon - prev.drawLon + 180) % 360) - 180)
        if (diff < 5) drawLon = prev.drawLon + 5
      }
      result.push({ name, lon, drawLon })
    }
    return result
  }, [transitPositions])

  // 直近21日以内のアクティブなアスペクト（スコア降順 上位10件）
  const activeAspects = useMemo(() => {
    const now = new Date()
    const limit = new Date(); limit.setDate(now.getDate() + 21)
    return events
      .filter(e => { const dt = new Date(e.exact_dt); return dt >= now && dt <= limit })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [events])

  return (
    <div className="space-y-1 mb-4">
      <p className="text-xs text-muted-foreground text-center">
        トランジット2層ホイール（外: T · 内: N · 中心線: 直近21日のアスペクト）
        {!currentPlanets && <span className="text-yellow-600/70"> ※推定位置</span>}
      </p>
      <div className="flex justify-center">
        <svg viewBox="0 0 400 400" className="max-w-sm w-full h-auto">

          {/* 背景 */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="#0f172a" />

          {/* ─── 黄道帯12サイン ─────────────────────────────────────── */}
          {SIGNS.map((sign, i) => {
            const startLon = i * 30, endLon = startLon + 30
            const a1 = 180 - ((startLon - asc + 360) % 360)
            const a2 = 180 - ((endLon   - asc + 360) % 360)
            const toV = (ang: number, r: number) => ({
              x: CX + r * Math.cos(ang * Math.PI / 180),
              y: CY + r * Math.sin(ang * Math.PI / 180),
            })
            const os = toV(a1, R_OUTER), oe = toV(a2, R_OUTER)
            const is = toV(a1, R_SIGN),  ie = toV(a2, R_SIGN)
            const pathD = [
              `M ${os.x} ${os.y}`,
              `A ${R_OUTER} ${R_OUTER} 0 0 0 ${oe.x} ${oe.y}`,
              `L ${ie.x} ${ie.y}`,
              `A ${R_SIGN} ${R_SIGN} 0 0 1 ${is.x} ${is.y}`,
              'Z',
            ].join(' ')
            const mid = toV(180 - ((startLon + 15 - asc + 360) % 360), (R_OUTER + R_SIGN) / 2)
            const elem = SIGN_ELEMENTS[sign]
            return (
              <g key={sign}>
                <path d={pathD} fill={ELEMENT_COLORS[elem]} stroke="#1e293b" strokeWidth={0.5} />
                <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={9} fill={ELEMENT_TEXT[elem]} fontWeight="600">
                  {ZODIAC_SYMBOLS[i]}
                </text>
              </g>
            )
          })}

          {/* トランジットリング背景 */}
          <circle cx={CX} cy={CY} r={R_SIGN} fill="#0f172a" />

          {/* ─── ハウス区切り線・番号 ───────────────────────────────── */}
          {natal.houses.cusps.map((cusp, i) => {
            const p1 = pos(cusp, R_SIGN), p2 = pos(cusp, R_HOUSE)
            const isAxis = i === 0 || i === 3 || i === 6 || i === 9
            const next = natal.houses.cusps[(i + 1) % 12]
            let midLon = (cusp + next) / 2
            if (next < cusp) midLon = (cusp + next + 360) / 2
            const np = pos(midLon % 360, R_HLABEL)
            return (
              <g key={i}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={isAxis ? '#94a3b8' : '#334155'}
                  strokeWidth={isAxis ? 1.5 : 0.8} />
                <text x={np.x} y={np.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={7} fill="#475569">{i + 1}</text>
              </g>
            )
          })}

          {/* T/N 境界線・ハウス内縁 */}
          <circle cx={CX} cy={CY} r={R_DIVIDER} fill="none" stroke="#475569"
            strokeWidth={1} strokeDasharray="4 3" />
          <circle cx={CX} cy={CY} r={R_HOUSE} fill="none" stroke="#1e293b" strokeWidth={0.5} />

          {/* ─── アスペクト線（中心部）────────────────────────────── */}
          {activeAspects.map((e, i) => {
            const np = natal.planets[e.natal_planet]
            const tp = transitPositions.find(t => t.name === e.transit_planet)
            if (!np || !tp) return null
            const from = lonToXY(np.longitude, asc, R_ASPECT, CX, CY)
            const to   = lonToXY(tp.lon,        asc, R_ASPECT, CX, CY)
            const color = ASPECT_COLORS[e.aspect] ?? '#64748b'
            return (
              <line key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={color}
                strokeWidth={e.type === 'ハード' ? 1.2 : 0.8}
                strokeOpacity={0.65}
                strokeDasharray={e.type === 'ハード' ? undefined : '3 2'} />
            )
          })}

          {/* ─── ネイタル天体（内側リング）────────────────────────── */}
          {Object.entries(natal.planets)
            .filter(([name]) => !['SNode', 'Fortune'].includes(name))
            .map(([name, p]) => {
              const { x, y } = pos(p.longitude, R_N)
              const t1 = pos(p.longitude, R_DIVIDER - 1)
              const t2 = pos(p.longitude, R_DIVIDER - 7)
              const isSpecial = name === 'ASC' || name === 'MC'
              const color = PLANET_COLORS[name] ?? '#ffffff'
              return (
                <g key={name}>
                  <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
                    stroke={color} strokeWidth={1} strokeOpacity={0.4} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fontSize={isSpecial ? 7 : 10}
                    fill={color}
                    fontWeight={isSpecial ? 'normal' : 'bold'}>
                    {isSpecial ? name : (PLANET_SYMBOLS[name] ?? name[0])}
                  </text>
                  {p.retrograde && !isSpecial && (
                    <text x={x + 6} y={y - 5} fontSize={5} fill={color} opacity={0.8}>ℛ</text>
                  )}
                </g>
              )
            })}

          {/* ─── トランジット天体（外側リング）───────────────────── */}
          {transitDraw.map(({ name, lon, drawLon }) => {
            const { x, y } = pos(drawLon, R_T)
            const t1 = pos(lon, R_SIGN - 1)
            const t2 = pos(lon, R_SIGN - 7)
            const color = PLANET_COLORS[name] ?? '#ffffff'
            return (
              <g key={`t_${name}`}>
                <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
                  stroke={color} strokeWidth={1} strokeOpacity={0.5} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                  fontSize={10} fill={color} fontWeight="bold">
                  {PLANET_SYMBOLS[name] ?? name[0]}
                </text>
              </g>
            )
          })}

          {/* ─── ASC/DSC/MC/IC ラベル ─────────────────────────────── */}
          {[
            { label: 'ASC', lon: natal.houses.asc },
            { label: 'DSC', lon: natal.houses.asc + 180 },
            { label: 'MC',  lon: natal.houses.mc },
            { label: 'IC',  lon: natal.houses.mc + 180 },
          ].map(({ label, lon }) => {
            const { x, y } = pos(lon % 360, R_OUTER + 11)
            return (
              <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                fontSize={7} fill="#94a3b8" fontWeight="600">{label}</text>
            )
          })}
        </svg>
      </div>

      {/* ── 月別トランジット件数（時間軸概観）──────────────────────── */}
      <MonthlyBarChart events={events} />
    </div>
  )
}

function MonthlyBarChart({ events }: { events: TransitEvent[] }) {
  const data = useMemo(() => {
    const map: Record<string, { month: string; ハード: number; ソフト: number }> = {}
    for (const e of events) {
      const d = new Date(e.exact_dt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { month: `${d.getMonth() + 1}月`, ハード: 0, ソフト: 0 }
      if (e.type === 'ハード') map[key].ハード++
      else if (e.type === 'ソフト') map[key].ソフト++
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [events])

  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground mb-1">月別トランジット件数</p>
      <ResponsiveContainer width="100%" height={150}>
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
          <Bar dataKey="ハード" stackId="a" fill="var(--aspect-square)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="ソフト" stackId="a" fill="var(--aspect-trine)"  radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
