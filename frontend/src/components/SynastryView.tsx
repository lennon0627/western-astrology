'use client'

import { useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import ChartWheel from '@/components/ChartWheel'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import type { ChartResponse, SynastryAspect, SynastryResponse } from '@/lib/types'

// ── 5軸定義 ─────────────────────────────────────────────────────────────────

const AXES: { label: string; pairs: [string, string][] }[] = [
  {
    label: '愛情',
    pairs: [
      ['Venus', 'Moon'], ['Venus', 'Sun'], ['Moon', 'Sun'],
      ['Venus', 'Mars'], ['Moon', 'Mars'], ['Venus', 'Venus'],
    ],
  },
  {
    label: 'コミュ',
    pairs: [
      ['Mercury', 'Mercury'], ['Mercury', 'Moon'], ['Mercury', 'Sun'],
      ['Mercury', 'Venus'],   ['Mercury', 'Mars'],
    ],
  },
  {
    label: '価値観',
    pairs: [
      ['Venus', 'Jupiter'], ['Venus', 'Saturn'], ['Sun', 'Jupiter'],
      ['Sun', 'Saturn'],    ['Jupiter', 'Jupiter'], ['Moon', 'Jupiter'],
    ],
  },
  {
    label: '成長',
    pairs: [
      ['Jupiter', 'Sun'],  ['Jupiter', 'Moon'],  ['Jupiter', 'Venus'],
      ['Jupiter', 'Mars'], ['Uranus', 'Sun'],     ['Uranus', 'Moon'],
    ],
  },
  {
    label: '安定',
    pairs: [
      ['Saturn', 'Moon'],   ['Saturn', 'Sun'],   ['Saturn', 'Venus'],
      ['Saturn', 'Saturn'], ['Moon', 'Moon'],    ['Saturn', 'Mars'],
    ],
  },
]

/**
 * inter_aspects から1軸のスコア (15–95) を計算。
 * ソフトアスペクト → プラス寄与 / ハード → マイナス寄与
 * データなし → ニュートラル 55
 */
function calcAxisScore(aspects: SynastryAspect[], pairs: [string, string][]): number {
  const relevant = aspects.filter(a =>
    pairs.some(([p1, p2]) =>
      (a.planet_a === p1 && a.planet_b === p2) ||
      (a.planet_a === p2 && a.planet_b === p1),
    ),
  )
  if (relevant.length === 0) return 55

  let net = 0, total = 0
  for (const a of relevant) {
    const w = Math.abs(a.score) * (a.pair_weight || 1)
    net   += a.type === 'ソフト' ? w : -w
    total += w
  }
  if (total === 0) return 55
  return Math.round(Math.max(15, Math.min(95, 55 + (net / total) * 40)))
}

// ── コンポジットチャート生成 ─────────────────────────────────────────────────

function makeCompositeChart(data: SynastryResponse): ChartResponse {
  return {
    birth_dt: '', lat: 0, lon: 0, tz: '', jd: 0,
    planets: data.composite.planets,
    houses: {
      cusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
      asc: 0, mc: 270,
    },
    aspects: data.composite.aspects,
    total_score: 0, score_label: '', score_message: '',
    score_breakdown: {
      dignity: { raw: 0, normalized: 0, strong: [], weak: [] },
      house:   { raw: 0, normalized: 0, strong: [], weak: [] },
      aspect:  { raw: 0, normalized: 0, strong: [], weak: [] },
    },
    strong_points: [], challenging_points: [],
  }
}

// ── メインコンポーネント ─────────────────────────────────────────────────────

export default function SynastryView({ data }: { data: SynastryResponse }) {
  const { inter_aspects, score } = data
  const { total_score, score_label, score_message, score_breakdown } = score

  const compositeChart = useMemo(() => makeCompositeChart(data), [data])

  const radarData = useMemo(
    () => AXES.map(({ label, pairs }) => ({
      axis:  label,
      score: calcAxisScore(inter_aspects, pairs),
    })),
    [inter_aspects],
  )

  const scoreColor =
    total_score >= 70 ? 'text-yellow-400' :
    total_score >= 50 ? 'text-green-400' : 'text-red-400'
  const barColor =
    total_score >= 70 ? 'bg-yellow-400' :
    total_score >= 50 ? 'bg-green-400' : 'bg-red-400'

  return (
    <div className="space-y-6">

      {/* ── 総合スコア + 5軸レーダーチャート ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">

        {/* 左: 総合スコア */}
        <div className="text-center space-y-2">
          <div className={`text-5xl font-bold ${scoreColor}`}>{total_score}</div>
          <div className="text-lg font-semibold">{score_label}</div>
          <div className="text-sm text-muted-foreground">{score_message}</div>
          <div className="mx-auto max-w-xs">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${total_score}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>ソフト +{score_breakdown.soft_total.toFixed(1)}</span>
              <span>ハード {score_breakdown.hard_total.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* 右: 5軸レーダーチャート */}
        <div>
          <p className="text-xs text-muted-foreground text-center mb-1">5軸相性分析</p>
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}点`, '']}
              />
              <Radar
                dataKey="score"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.25}
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 重要な天体ペア ─────────────────────────────────────────────────── */}
      {score_breakdown.key_aspects.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2 text-yellow-400">★ 重要な天体ペア</div>
          <div className="space-y-1">
            {score_breakdown.key_aspects.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm px-2 py-1 rounded bg-yellow-500/10">
                <span className={`font-bold ${planetClass(a.planet_a)}`}>
                  {PLANET_SYMBOLS[a.planet_a] ?? a.planet_a}
                </span>
                <span className={`text-xs ${aspectClass(a.aspect)}`}>{a.aspect_jp}</span>
                <span className={`font-bold ${planetClass(a.planet_b)}`}>
                  {PLANET_SYMBOLS[a.planet_b] ?? a.planet_b}
                </span>
                <span className="text-xs text-muted-foreground flex-1">{a.combo_desc}</span>
                <Badge variant="outline" className={`text-xs ${
                  a.type === 'ハード' ? 'border-red-500/40 text-red-400' : 'border-blue-500/40 text-blue-400'
                }`}>
                  {a.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── コンポジットチャート ──────────────────────────────────────────── */}
      <div>
        <div className="text-sm font-semibold mb-3">コンポジットチャート（中点法）</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex justify-center">
            <ChartWheel chart={compositeChart} size={360} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              コンポジットアスペクト（{data.composite.aspects.length}件）
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {data.composite.aspects.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/20">
                  <span className={`font-bold ${planetClass(a.planet1)}`}>
                    {PLANET_SYMBOLS[a.planet1] ?? ''} {a.planet1_jp}
                  </span>
                  <span className={aspectClass(a.aspect)}>{a.aspect_jp}</span>
                  <span className={`font-bold ${planetClass(a.planet2)}`}>
                    {PLANET_SYMBOLS[a.planet2] ?? ''} {a.planet2_jp}
                  </span>
                  <span className="text-muted-foreground font-mono ml-auto">{a.orb.toFixed(2)}°</span>
                  <Badge variant="outline" className={`text-[10px] px-1 ${
                    a.type === 'ハード' ? 'border-red-500/40 text-red-400' :
                    a.type === 'ソフト' ? 'border-blue-500/40 text-blue-400' :
                    'border-border text-muted-foreground'
                  }`}>
                    {a.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── インターアスペクト全リスト ─────────────────────────────────────── */}
      <div>
        <div className="text-sm font-semibold mb-2">インターアスペクト ({inter_aspects.length}件)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-1.5 pr-2">A天体</th>
                <th className="text-left py-1.5 pr-2">アスペクト</th>
                <th className="text-left py-1.5 pr-2">B天体</th>
                <th className="text-right py-1.5 pr-2">orb</th>
                <th className="text-right py-1.5">タイプ</th>
              </tr>
            </thead>
            <tbody>
              {inter_aspects.slice(0, 30).map((a, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-1 pr-2">
                    <span className={planetClass(a.planet_a)}>
                      {PLANET_SYMBOLS[a.planet_a] ?? ''} {a.planet_a_jp}
                    </span>
                  </td>
                  <td className="py-1 pr-2">
                    <span className={aspectClass(a.aspect)}>{a.aspect_jp}</span>
                  </td>
                  <td className="py-1 pr-2">
                    <span className={planetClass(a.planet_b)}>
                      {PLANET_SYMBOLS[a.planet_b] ?? ''} {a.planet_b_jp}
                    </span>
                  </td>
                  <td className="py-1 pr-2 text-right text-muted-foreground font-mono">
                    {a.orb.toFixed(2)}°
                  </td>
                  <td className="py-1 text-right">
                    <Badge variant="outline" className={`text-xs ${
                      a.type === 'ハード' ? 'border-red-500/40 text-red-400' :
                      a.type === 'ソフト' ? 'border-blue-500/40 text-blue-400' :
                      'border-border text-muted-foreground'
                    }`}>
                      {a.type}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
