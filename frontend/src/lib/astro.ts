// ── SVG座標計算 ─────────────────────────────────────────────────────────────

/**
 * 黄経→SVG座標変換
 * ASCを9時位置（左）に固定。黄道帯は反時計回り（黄経増加 = 反時計）。
 */
export function lonToXY(
  lon: number,
  ascLon: number,
  r: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const offset = ((lon - ascLon) % 360 + 360) % 360
  const rad = ((180 - offset) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/**
 * SVG arc path (扇形の弧)
 * startAngle/endAngle は数学角度（度数、反時計回り）
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const s = (startDeg * Math.PI) / 180
  const e = (endDeg * Math.PI) / 180
  const x1 = cx + r * Math.cos(s)
  const y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e)
  const y2 = cy + r * Math.sin(e)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`
}

// ── 天体定数 ─────────────────────────────────────────────────────────────────

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  NNode: '☊', SNode: '☋', Fortune: '⊕', ASC: 'AC', MC: 'MC',
}

export const PLANET_COLORS: Record<string, string> = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#90EE90', Venus: '#FFB6C1',
  Mars: '#FF6B6B', Jupiter: '#FFA500', Saturn: '#A0A080', Uranus: '#87CEEB',
  Neptune: '#9370DB', Pluto: '#CD5C5C', NNode: '#FFD700', SNode: '#C0C0C0',
  Fortune: '#FF69B4', ASC: '#FFFFFF', MC: '#FFFFFF',
}

export const ASPECT_COLORS: Record<string, string> = {
  Conjunction: '#c8a520',
  Sextile: '#3a9060',
  Square: '#b84848',
  Trine: '#4878b0',
  Opposition: '#b86828',
  Quincunx: '#8858b8',
  Sesquiquadrate: '#a05820',
}

// ── 黄道帯定数 ───────────────────────────────────────────────────────────────

export const ZODIAC_SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]

export const ZODIAC_SYMBOLS = [
  '♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓',
]

export const ZODIAC_JP = [
  '牡羊','牡牛','双子','蟹','獅子','乙女',
  '天秤','蠍','射手','山羊','水瓶','魚',
]

type Element = 'fire' | 'earth' | 'air' | 'water'

export const SIGN_ELEMENTS: Record<string, Element> = {
  Aries:'fire', Leo:'fire', Sagittarius:'fire',
  Taurus:'earth', Virgo:'earth', Capricorn:'earth',
  Gemini:'air', Libra:'air', Aquarius:'air',
  Cancer:'water', Scorpio:'water', Pisces:'water',
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire:  '#3d1515',   // deep crimson
  earth: '#2e2010',   // dark sienna
  air:   '#111e35',   // deep navy
  water: '#0c2620',   // deep teal
}

export const ELEMENT_TEXT: Record<Element, string> = {
  fire:  '#c08080',
  earth: '#a08858',
  air:   '#5888b8',
  water: '#489888',
}

// ── CSS クラスヘルパー（インラインスタイル不要）────────────────────────────

export const PLANET_CLASS: Record<string, string> = {
  Sun:     'text-planet-sun',     Moon:    'text-planet-moon',
  Mercury: 'text-planet-mercury', Venus:   'text-planet-venus',
  Mars:    'text-planet-mars',    Jupiter: 'text-planet-jupiter',
  Saturn:  'text-planet-saturn',  Uranus:  'text-planet-uranus',
  Neptune: 'text-planet-neptune', Pluto:   'text-planet-pluto',
  NNode:   'text-planet-nnode',   SNode:   'text-planet-snode',
  Fortune: 'text-planet-fortune', ASC:     'text-planet-asc',
  MC:      'text-planet-mc',
}

export const ASPECT_CLASS: Record<string, string> = {
  Conjunction:    'text-aspect-conjunction',
  Sextile:        'text-aspect-sextile',
  Square:         'text-aspect-square',
  Trine:          'text-aspect-trine',
  Opposition:     'text-aspect-opposition',
  Quincunx:       'text-aspect-quincunx',
  Sesquiquadrate: 'text-aspect-sesquiquadrate',
}

export function planetClass(name: string): string {
  return PLANET_CLASS[name] ?? 'text-foreground'
}

export function aspectClass(name: string): string {
  return ASPECT_CLASS[name] ?? 'text-muted-foreground'
}
