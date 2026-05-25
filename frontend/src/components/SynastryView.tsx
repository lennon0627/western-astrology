import { Badge } from '@/components/ui/badge'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import type { SynastryResponse } from '@/lib/types'

export default function SynastryView({ data }: { data: SynastryResponse }) {
  const { inter_aspects, score } = data
  const { total_score, score_label, score_message, top_aspects, challenging_aspects, score_breakdown } = score

  const scoreColor =
    total_score >= 70 ? 'text-yellow-400' :
    total_score >= 50 ? 'text-green-400' : 'text-red-400'
  const barColor =
    total_score >= 70 ? 'bg-yellow-400' :
    total_score >= 50 ? 'bg-green-400' : 'bg-red-400'

  return (
    <div className="space-y-6">
      {/* 相性スコア */}
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

      {/* 重要アスペクト */}
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
                <Badge variant="outline" className={`text-xs ${a.type === 'ハード' ? 'border-red-500/40 text-red-400' : 'border-blue-500/40 text-blue-400'}`}>
                  {a.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* インターアスペクト全リスト */}
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
