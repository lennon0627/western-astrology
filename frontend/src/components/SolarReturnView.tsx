import { Badge } from '@/components/ui/badge'
import ChartWheel from '@/components/ChartWheel'
import { planetClass, aspectClass, PLANET_SYMBOLS } from '@/lib/astro'
import type { SolarReturnData } from '@/lib/types'

export default function SolarReturnView({ data }: { data: SolarReturnData }) {
  const { sr_chart, sr_dt, sr_aspects_to_natal } = data

  const dt = new Date(sr_dt)
  const dateStr = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')} UTC`

  return (
    <div className="space-y-6">
      {/* SR日時 */}
      <div className="text-center">
        <div className="text-lg font-semibold">☉ ソーラーリターン</div>
        <div className="text-muted-foreground text-sm mt-1">{dateStr}</div>
        <div className="text-xs text-muted-foreground">太陽が出生時の黄経に戻った瞬間</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SRチャートホイール */}
        <div className="flex justify-center">
          <ChartWheel chart={sr_chart} size={380} />
        </div>

        {/* SRとネイタルのアスペクト */}
        <div>
          <div className="text-sm font-semibold mb-2">
            SRチャート × ネイタルのアスペクト ({sr_aspects_to_natal.length}件)
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sr_aspects_to_natal.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/20">
                <span className={`font-bold ${planetClass(a.sr_planet)}`}>
                  SR.{PLANET_SYMBOLS[a.sr_planet] ?? a.sr_planet}
                </span>
                <span className={aspectClass(a.aspect)}>{a.aspect_jp}</span>
                <span className={`font-bold ${planetClass(a.natal_planet)}`}>
                  N.{PLANET_SYMBOLS[a.natal_planet] ?? a.natal_planet}
                </span>
                <span className="text-muted-foreground font-mono ml-auto">{a.orb.toFixed(2)}°</span>
                <Badge variant="outline" className={`text-xs ${
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
  )
}
