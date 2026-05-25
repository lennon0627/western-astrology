import type { BirthRequest, ReadingResponse, SynastryResponse } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

export function fetchReading(
  person: BirthRequest,
  current_dt: string,
  sr_year: number,
  transit_days = 365,
): Promise<ReadingResponse> {
  return post('/reading', { person, current_dt, sr_year, transit_days })
}

export function fetchSynastry(
  person_a: BirthRequest,
  person_b: BirthRequest,
): Promise<SynastryResponse> {
  return post('/synastry', { person_a, person_b })
}
