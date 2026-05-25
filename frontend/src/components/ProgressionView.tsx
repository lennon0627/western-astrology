import { Badge } from '@/components/ui/badge'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import type { ProgressionResult } from '@/lib/types'

const PLANET_ORDER = [
  'Sun','Moon','Mercury','Venus','Mars',
  'Jupiter','Saturn','Uranus','Neptune','Pluto','ASC','MC',
]

export default function ProgressionView({ data }: { data: ProgressionResult }) {
  const { prog_planets, aspects_to_natal, age_years, moon_timeline } = data

  return (
    <div className="space-y-6">
      {/* 現在年齢 */}
      <div className="text-center">
        <span className="text-3xl font-bold">{age_years.toFixed(1)}</span>
        <span className="text-muted-foreground ml-2">歳時点のプログレス配置</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* プログレス天体 */}
        <div>
          <div className="text-sm font-semibold mb-2">プログレス天体位置</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-1.5 pr-2">天体</th>
                <th className="text-left py-1.5">度数</th>
              </tr>
            </thead>
            <tbody>
              {PLANET_ORDER.map(name => {
                const p = prog_planets[name]
                if (!p) return null
                return (
                  <tr key={name} className="border-b border-border/30">
                    <td className="py-1 pr-2">
                      <span className={`mr-1 ${planetClass(name)}`}>{PLANET_SYMBOLS[name] ?? ''}</span>
                      {name}
                      {p.retrograde && <span className="ml-1 text-muted-foreground">ℛ</span>}
                    </td>
                    <td className="py-1 text-muted-foreground font-mono">{p.degree_str}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ネイタルとのアスペクト */}
        <div>
          <div className="text-sm font-semibold mb-2">ネイタルとのアスペクト ({aspects_to_natal.length}件)</div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {aspects_to_natal.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/20">
                <span className={`font-bold ${planetClass(a.prog_planet)}`}>
                  {PLANET_SYMBOLS[a.prog_planet] ?? a.prog_planet}
                </span>
                <span className={aspectClass(a.aspect)}>{a.aspect_jp}</span>
                <span className={`font-bold ${planetClass(a.natal_planet)}`}>
                  {PLANET_SYMBOLS[a.natal_planet] ?? a.natal_planet}
                </span>
                <span className="text-muted-foreground font-mono ml-auto">{a.orb.toFixed(2)}°</span>
                <Badge variant="outline" className={`text-xs ${
                  a.type === 'ハード' ? 'border-red-500/40 text-red-400' : 'border-blue-500/40 text-blue-400'
                }`}>
                  {a.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 月タイムライン */}
      <div>
        <div className="text-sm font-semibold mb-2">☽ プログレス月の移行予報（今後5年）</div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {moon_timeline.map((e, i) => (
            <div key={i} className={`flex items-start gap-3 text-xs px-2 py-1.5 rounded
              ${e.type === '合' ? 'bg-blue-500/10' : 'bg-muted/20'}`}>
              <span className="text-muted-foreground font-mono shrink-0 w-16">
                +{e.future_years.toFixed(1)}年後
              </span>
              <span className={e.type === '合' ? 'text-blue-300' : 'text-muted-foreground'}>
                {e.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
