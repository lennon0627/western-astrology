export interface BirthRequest {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
  lat?: number
  lon?: number
  tz?: string
}

export interface Planet {
  name: string
  longitude: number
  latitude: number
  speed: number
  retrograde: boolean
  sign: string
  sign_jp: string
  sign_num: number
  sign_symbol: string
  degree: number
  degree_str: string
  house: number
  dignity: string | null
  dignity_score: number | null
}

export interface Aspect {
  planet1: string
  planet2: string
  planet1_jp: string
  planet2_jp: string
  aspect: string
  aspect_jp: string
  orb: number
  angle?: number
  applying?: boolean
  type: string
  label: string
}

export interface ScorePoint {
  planet_jp: string
  detail: string
  pts: number
  positive: boolean
}

export interface ComponentScore {
  raw: number
  normalized: number
  strong: ScorePoint[]
  weak: ScorePoint[]
}

export interface ChartResponse {
  birth_dt: string
  lat: number
  lon: number
  tz: string
  jd: number
  planets: Record<string, Planet>
  houses: { cusps: number[]; asc: number; mc: number }
  aspects: Aspect[]
  total_score: number
  score_label: string
  score_message: string
  score_breakdown: {
    dignity: ComponentScore
    house: ComponentScore
    aspect: ComponentScore
  }
  strong_points: ScorePoint[]
  challenging_points: ScorePoint[]
}

export interface TransitEvent {
  exact_dt: string
  transit_planet: string
  natal_planet: string
  transit_planet_jp: string
  natal_planet_jp: string
  aspect: string
  aspect_jp: string
  asp_angle: number
  score: number
  special: string
  type: string
  label: string
}

export interface SynastryAspect {
  planet_a: string
  planet_b: string
  planet_a_jp: string
  planet_b_jp: string
  aspect: string
  aspect_jp: string
  orb: number
  type: string
  score: number
  pair_weight: number
  combo_desc: string
  label: string
}

export interface SynastryScore {
  total_score: number
  score_label: string
  score_message: string
  top_aspects: SynastryAspect[]
  challenging_aspects: SynastryAspect[]
  score_breakdown: {
    soft_total: number
    hard_total: number
    key_aspects: SynastryAspect[]
  }
}

export interface SynastryResponse {
  person_a: ChartResponse
  person_b: ChartResponse
  inter_aspects: SynastryAspect[]
  composite: {
    planets: Record<string, Planet>
    aspects: Aspect[]
  }
  score: SynastryScore
}

// ── Progression ──────────────────────────────────────────────────────────────

export interface ProgAspect {
  prog_planet: string
  natal_planet: string
  prog_planet_jp: string
  natal_planet_jp: string
  aspect: string
  aspect_jp: string
  orb: number
  type: string
  label: string
}

export interface MoonEvent {
  type: string
  planet: string
  detail: string
  prog_jd: number
  age: number
  future_years: number
}

export interface ProgPlanet {
  name: string
  longitude: number
  latitude: number
  speed: number
  retrograde: boolean
  sign: string
  sign_jp: string
  sign_num: number
  degree: number
  degree_str: string
}

export interface ProgressionResult {
  prog_planets: Record<string, ProgPlanet>
  prog_asc: number | null
  prog_mc: number | null
  aspects_to_natal: ProgAspect[]
  age_years: number
  prog_jd: number
  moon_timeline: MoonEvent[]
}

// ── Solar Arc ────────────────────────────────────────────────────────────────

export interface SANatalAspect {
  sa_planet: string
  natal_planet: string
  sa_planet_jp: string
  natal_planet_jp: string
  aspect: string
  aspect_jp: string
  orb: number
  type: string
  solar_arc: number
  label: string
}

export interface SAFutureEvent {
  type: string
  detail: string
  age: number
  future_years: number
  orb: number
}

export interface SAPlanet {
  name: string
  name_jp: string
  longitude: number
  sign: string
  sign_jp: string
  sign_num: number
  degree: number
  degree_str: string
  natal_long: number
}

export interface SAResult {
  sa_planets: Record<string, SAPlanet>
  solar_arc: number
  aspects_to_natal: SANatalAspect[]
  age_years: number
  future_events: SAFutureEvent[]
}

// ── Solar Return ─────────────────────────────────────────────────────────────

export interface SRNatalAspect {
  sr_planet: string
  natal_planet: string
  sr_planet_jp: string
  natal_planet_jp: string
  aspect: string
  aspect_jp: string
  orb: number
  type: string
  label: string
}

export interface SolarReturnData {
  sr_chart: ChartResponse
  sr_dt: string
  sr_jd: number
  natal_sun_long: number
  sr_aspects_to_natal: SRNatalAspect[]
}

// ── Reading（全データ統合レスポンス）────────────────────────────────────────

export interface ReadingResponse {
  chart:        ChartResponse
  transit:      { events: TransitEvent[] }
  progression:  ProgressionResult
  solar_arc:    SAResult
  solar_return: SolarReturnData
}
