import { planetClass, PLANET_SYMBOLS } from '@/lib/astro'
import type { ChartResponse } from '@/lib/types'

const ORDER = [
  'Sun','Moon','Mercury','Venus','Mars',
  'Jupiter','Saturn','Uranus','Neptune','Pluto',
  'NNode','ASC','MC',
]

const DIGNITY_STYLE: Record<string, string> = {
  domicile:   'bg-yellow-500/20 text-yellow-300',
  exaltation: 'bg-green-500/20 text-green-300',
  detriment:  'bg-red-500/20 text-red-300',
  fall:       'bg-orange-500/20 text-orange-300',
}

const DIGNITY_JP: Record<string, string> = {
  domicile: '品位', exaltation: '高揚',
  detriment: '障害', fall: '転落',
}

export default function PlanetTable({ chart }: { chart: ChartResponse }) {
  const { planets } = chart

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs">
            <th className="text-left py-2 pr-3">天体</th>
            <th className="text-left py-2 pr-3">度数</th>
            <th className="text-center py-2 pr-3">室</th>
            <th className="text-left py-2">品位</th>
          </tr>
        </thead>
        <tbody>
          {ORDER.map(name => {
            const p = planets[name]
            if (!p) return null
            const sym = PLANET_SYMBOLS[name] ?? ''
            const dig = p.dignity?.toLowerCase()
            return (
              <tr key={name} className="border-b border-border/30 hover:bg-muted/30">
                <td className="py-1.5 pr-3 font-medium">
                  <span className={`mr-1 ${planetClass(name)}`}>{sym}</span>
                  {name}
                  {p.retrograde && <span className="ml-1 text-xs text-muted-foreground">ℛ</span>}
                </td>
                <td className="py-1.5 pr-3 text-muted-foreground font-mono text-xs">
                  {p.degree_str}
                </td>
                <td className="py-1.5 pr-3 text-center text-muted-foreground">
                  {p.house > 0 ? p.house : '—'}
                </td>
                <td className="py-1.5">
                  {dig && DIGNITY_JP[dig] ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${DIGNITY_STYLE[dig]}`}>
                      {DIGNITY_JP[dig]}
                    </span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
