'use client'

import {
  lonToXY, arcPath,
  PLANET_SYMBOLS, PLANET_COLORS, ASPECT_COLORS,
  ZODIAC_SYMBOLS, ZODIAC_JP, SIGN_ELEMENTS, ELEMENT_COLORS, ELEMENT_TEXT,
} from '@/lib/astro'
import type { ChartResponse } from '@/lib/types'

const CX = 250, CY = 250
const R_OUTER   = 230   // 黄道帯 外縁
const R_SIGN    = 190   // 黄道帯 内縁
const R_HOUSE   = 130   // ハウス 内縁
const R_PLANET  = 160   // 天体位置
const R_HLABEL  = 110   // ハウス番号
const R_ASPECT  = 90    // アスペクト線の長さ制限（中心から）
const R_SYM     = 210   // サイン記号

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]

// 重要天体のみ描画（NNode/SNode/Fortuneは小さく）
const MINOR = new Set(['NNode','SNode','Fortune'])

interface Props {
  chart: ChartResponse
  size?: number
}

export default function ChartWheel({ chart, size = 500 }: Props) {
  const { planets, houses, aspects } = chart
  const asc = houses.asc

  // ── ヘルパー ────────────────────────────────────────────────────────────────

  function pos(lon: number, r: number) {
    return lonToXY(lon, asc, r, CX, CY)
  }

  // 黄道帯サインの弧の中央角度 (SVGアーク用)
  function signMidAngle(signIndex: number): number {
    const midLon = signIndex * 30 + 15
    const offset = ((midLon - asc) % 360 + 360) % 360
    return 180 - offset
  }

  // ── 天体の衝突回避（同一位置を少しずらす）──────────────────────────────────
  const planetPositions: { name: string; lon: number; drawLon: number }[] = []
  const skipPlanets = new Set(['SNode', 'Fortune'])

  for (const [name, p] of Object.entries(planets)) {
    if (skipPlanets.has(name)) continue
    let drawLon = p.longitude
    // 近接天体を少しずらす (5°以内)
    for (const prev of planetPositions) {
      const diff = Math.abs(((drawLon - prev.drawLon + 180) % 360) - 180)
      if (diff < 5) {
        drawLon = prev.drawLon + 5
      }
    }
    planetPositions.push({ name, lon: p.longitude, drawLon })
  }

  // ── SVG描画 ────────────────────────────────────────────────────────────────

  return (
    <svg
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className="font-sans select-none max-w-full h-auto"
    >
      {/* 背景 */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="#0f172a" />

      {/* ─── 黄道帯12サイン ─────────────────────────────────────────────────── */}
      {SIGNS.map((sign, i) => {
        const startLon = i * 30
        const endLon   = startLon + 30
        const offset_s = ((startLon - asc) % 360 + 360) % 360
        const offset_e = ((endLon   - asc) % 360 + 360) % 360
        const a1 = 180 - offset_s
        const a2 = 180 - offset_e
        const elem = SIGN_ELEMENTS[sign]
        const fill = ELEMENT_COLORS[elem]
        const text = ELEMENT_TEXT[elem]

        // 扇形（外縁リング）
        const o_s = { x: CX + R_OUTER * Math.cos(a1 * Math.PI / 180), y: CY + R_OUTER * Math.sin(a1 * Math.PI / 180) }
        const o_e = { x: CX + R_OUTER * Math.cos(a2 * Math.PI / 180), y: CY + R_OUTER * Math.sin(a2 * Math.PI / 180) }
        const i_s = { x: CX + R_SIGN  * Math.cos(a1 * Math.PI / 180), y: CY + R_SIGN  * Math.sin(a1 * Math.PI / 180) }
        const i_e = { x: CX + R_SIGN  * Math.cos(a2 * Math.PI / 180), y: CY + R_SIGN  * Math.sin(a2 * Math.PI / 180) }

        const path = [
          `M ${o_s.x} ${o_s.y}`,
          `A ${R_OUTER} ${R_OUTER} 0 0 0 ${o_e.x} ${o_e.y}`,
          `L ${i_e.x} ${i_e.y}`,
          `A ${R_SIGN} ${R_SIGN} 0 0 1 ${i_s.x} ${i_s.y}`,
          'Z',
        ].join(' ')

        const mid = signMidAngle(i)
        const symR = (R_OUTER + R_SIGN) / 2
        const symPos = { x: CX + symR * Math.cos(mid * Math.PI / 180), y: CY + symR * Math.sin(mid * Math.PI / 180) }

        return (
          <g key={sign}>
            <path d={path} fill={fill} stroke="#1e293b" strokeWidth={0.5} />
            <text
              x={symPos.x} y={symPos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={13} fill={text} fontWeight="600"
            >
              {ZODIAC_SYMBOLS[i]}
            </text>
          </g>
        )
      })}

      {/* ─── ハウス区切り線・番号 ────────────────────────────────────────────── */}
      {houses.cusps.map((cusp, i) => {
        const p1 = pos(cusp, R_SIGN)
        const p2 = pos(cusp, R_HOUSE)
        const isAxis = i === 0 || i === 3 || i === 6 || i === 9
        // ハウス番号の位置：次のカスプとの中間
        const nextCusp = houses.cusps[(i + 1) % 12]
        let midLon = (cusp + nextCusp) / 2
        if (nextCusp < cusp) midLon = (cusp + nextCusp + 360) / 2
        const numPos = pos(midLon % 360, R_HLABEL)

        return (
          <g key={i}>
            <line
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={isAxis ? '#94a3b8' : '#334155'}
              strokeWidth={isAxis ? 1.5 : 0.8}
            />
            <text
              x={numPos.x} y={numPos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={9} fill="#475569"
            >
              {i + 1}
            </text>
          </g>
        )
      })}

      {/* ハウス境界円 */}
      <circle cx={CX} cy={CY} r={R_SIGN}  fill="none" stroke="#334155" strokeWidth={0.8} />
      <circle cx={CX} cy={CY} r={R_HOUSE} fill="none" stroke="#1e293b" strokeWidth={0.5} />

      {/* ─── アスペクト線（中央部） ──────────────────────────────────────────── */}
      {aspects
        .filter(a => !['NNode','SNode','Fortune'].includes(a.planet1) && !['NNode','SNode','Fortune'].includes(a.planet2))
        .filter(a => a.orb < 6)
        .map((a, i) => {
          const p1 = planets[a.planet1]
          const p2 = planets[a.planet2]
          if (!p1 || !p2) return null
          const from = lonToXY(p1.longitude, asc, R_ASPECT, CX, CY)
          const to   = lonToXY(p2.longitude, asc, R_ASPECT, CX, CY)
          const color = ASPECT_COLORS[a.aspect] ?? '#64748b'
          const isHard = a.type === 'ハード'
          return (
            <line
              key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={color}
              strokeWidth={isHard ? 1.2 : 0.8}
              strokeOpacity={0.7}
              strokeDasharray={isHard ? undefined : '3 2'}
            />
          )
        })}

      {/* ─── 天体 ───────────────────────────────────────────────────────────── */}
      {planetPositions.map(({ name, lon, drawLon }) => {
        const p = planets[name]
        const { x, y } = lonToXY(drawLon, asc, R_PLANET, CX, CY)
        // 実際の位置から描画位置へのティック線
        const tick1 = lonToXY(lon, asc, R_SIGN - 2, CX, CY)
        const tick2 = lonToXY(lon, asc, R_SIGN - 10, CX, CY)
        const symbol = PLANET_SYMBOLS[name] ?? name[0]
        const color  = PLANET_COLORS[name] ?? '#ffffff'
        const isMinor = MINOR.has(name)
        const isSpecial = name === 'ASC' || name === 'MC'

        return (
          <g key={name}>
            {/* ティック線（実際の位置） */}
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y}
              stroke={color} strokeWidth={1} strokeOpacity={0.6} />
            {/* 天体記号 */}
            <text
              x={x} y={y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={isSpecial ? 9 : isMinor ? 10 : 14}
              fill={color}
              fontWeight={isSpecial ? 'normal' : 'bold'}
            >
              {isSpecial ? name : symbol}
            </text>
            {/* 逆行マーク */}
            {p.retrograde && !isSpecial && (
              <text x={x + 8} y={y - 7} fontSize={7} fill={color} opacity={0.8}>ℛ</text>
            )}
          </g>
        )
      })}

      {/* ─── ASC/DSC/MC/IC ラベル ────────────────────────────────────────────── */}
      {[
        { label: 'ASC', lon: houses.asc,       r: R_OUTER + 12 },
        { label: 'DSC', lon: houses.asc + 180, r: R_OUTER + 12 },
        { label: 'MC',  lon: houses.mc,         r: R_OUTER + 12 },
        { label: 'IC',  lon: houses.mc + 180,   r: R_OUTER + 12 },
      ].map(({ label, lon, r }) => {
        const { x, y } = pos(lon % 360, r)
        return (
          <text key={label} x={x} y={y}
            textAnchor="middle" dominantBaseline="central"
            fontSize={8} fill="#94a3b8" fontWeight="600"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
