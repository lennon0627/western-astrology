import NumberTicker from '@/components/ui/number-ticker'
import type { ChartResponse } from '@/lib/types'

const scoreColor = (s: number) =>
  s >= 70 ? 'text-yellow-400' : s >= 50 ? 'text-green-400' : s >= 35 ? 'text-blue-400' : 'text-red-400'

const barColor = (s: number) =>
  s >= 70 ? 'bg-yellow-400' : s >= 50 ? 'bg-green-400' : s >= 35 ? 'bg-blue-400' : 'bg-red-400'

export default function ScoreCard({ chart }: { chart: ChartResponse }) {
  const { total_score, score_label, score_message, score_breakdown, strong_points, challenging_points } = chart

  const components = [
    { label: 'エッセンシャル品位', key: 'dignity' as const, weight: '40%' },
    { label: 'ハウス位置',         key: 'house'   as const, weight: '25%' },
    { label: 'アスペクト調和度',   key: 'aspect'  as const, weight: '35%' },
  ]

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className={`text-5xl font-bold ${scoreColor(total_score)}`}>
          <NumberTicker value={total_score} />
        </div>
        <div className="text-lg font-semibold mt-1">{score_label}</div>
        <div className="text-xs text-muted-foreground mt-1">{score_message}</div>
      </div>

      <div className="space-y-2">
        {components.map(({ label, key, weight }) => {
          const comp = score_breakdown[key]
          const pct = Math.round((comp.normalized + 1) / 2 * 100)
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                <span>{label}</span>
                <span>{weight}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-green-400 font-semibold mb-1">✦ 強み</div>
          {strong_points.slice(0, 4).map((p, i) => (
            <div key={i} className="text-muted-foreground truncate">{p.detail}</div>
          ))}
        </div>
        <div>
          <div className="text-red-400 font-semibold mb-1">✦ 課題</div>
          {challenging_points.slice(0, 4).map((p, i) => (
            <div key={i} className="text-muted-foreground truncate">{p.detail}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
