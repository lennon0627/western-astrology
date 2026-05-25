import { Badge } from '@/components/ui/badge'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import type { SAResult } from '@/lib/types'

export default function SolarArcView({ data }: { data: SAResult }) {
  const { sa_planets, solar_arc, aspects_to_natal, age_years, future_events } = data

  return (
    <div className="space-y-6">
      {/* SA角度 */}
      <div className="text-center space-y-1">
        <div className="text-4xl font-bold text-yellow-400">{solar_arc.toFixed(2)}°</div>
        <div className="text-sm text-muted-foreground">ソーラーアーク（{age_years.toFixed(1)}歳）</div>
        <div className="text-xs text-muted-foreground">全天体がこの角度だけ進行した配置</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SA天体位置 */}
        <div>
          <div className="text-sm font-semibold mb-2">SA天体位置</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-1.5 pr-2">天体</th>
                <th className="text-left py-1.5">度数</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sa_planets).map(([name, p]) => (
                <tr key={name} className="border-b border-border/30">
                  <td className="py-1 pr-2">
                    <span className={`mr-1 ${planetClass(name)}`}>{PLANET_SYMBOLS[name] ?? ''}</span>
                    {name}
                  </td>
                  <td className="py-1 text-muted-foreground font-mono">{p.degree_str}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 現在のアスペクト */}
        <div>
          <div className="text-sm font-semibold mb-2">ネイタルとのアスペクト（orb ≤ 2°）</div>
          {aspects_to_natal.length === 0 ? (
            <p className="text-xs text-muted-foreground">該当するアスペクトはありません</p>
          ) : (
            <div className="space-y-1">
              {aspects_to_natal.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/20">
                  <span className={`font-bold ${planetClass(a.sa_planet)}`}>
                    SA.{PLANET_SYMBOLS[a.sa_planet] ?? a.sa_planet}
                  </span>
                  <span className={aspectClass(a.aspect)}>{a.aspect_jp}</span>
                  <span className={`font-bold ${planetClass(a.natal_planet)}`}>
                    N.{PLANET_SYMBOLS[a.natal_planet] ?? a.natal_planet}
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
          )}
        </div>
      </div>

      {/* 今後5年のイベント */}
      <div>
        <div className="text-sm font-semibold mb-2">今後5年のSAイベント予測</div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {future_events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 text-xs px-2 py-1.5 rounded hover:bg-muted/20">
              <span className="text-muted-foreground font-mono shrink-0 w-16">
                +{e.future_years.toFixed(1)}年後
              </span>
              <span className="text-foreground flex-1">{e.detail}</span>
              <span className="text-muted-foreground font-mono">orb {e.orb.toFixed(2)}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
