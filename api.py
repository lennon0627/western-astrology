"""
西洋占星術 FastAPI
起動: uvicorn api:app --reload --port 8001
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engine.calculator import WesternAstrologyEngine
from engine.dignity import calc_all_dignities, calc_ruler_analysis
from engine.scoring import calc_natal_score
from engine.synastry import calc_synastry
from engine.transits import calc_transit_calendar, calc_current_transit_positions, calc_retrograde_periods
from engine.progressions import calc_secondary_progression
from engine.solar_arc import calc_solar_arc
from engine.solar_return import calc_solar_return, calc_sr_aspects_to_natal

app = FastAPI(
    title="西洋占星術 API",
    version="2.0.0",
    description="Tropical / Placidus 西洋占星術計算エンジン",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine = WesternAstrologyEngine()


# ── リクエストモデル ──────────────────────────────────────────────────────

class BirthRequest(BaseModel):
    year:   int
    month:  int
    day:    int
    hour:   int   = Field(12, ge=0, le=23)
    minute: int   = Field(0,  ge=0, le=59)
    city:   Optional[str]   = None
    lat:    Optional[float] = None
    lon:    Optional[float] = None
    tz:     Optional[str]   = None
    house_system: str = Field("P", description="P=Placidus / K=Koch / W=Whole Sign / A=Equal")


class ReadingRequest(BaseModel):
    person:       BirthRequest
    current_dt:   str = Field(
        default_factory=lambda: datetime.now().isoformat(timespec="seconds"),
        description="プログレッション・ソーラーアーク基準日時 ISO8601",
    )
    sr_year:      int = Field(
        default_factory=lambda: datetime.now().year,
        description="ソーラーリターンを計算する年",
    )
    transit_days: int = Field(365, ge=1, le=730)


class SynastryRequest(BaseModel):
    person_a: BirthRequest
    person_b: BirthRequest


# ── ヘルパー ──────────────────────────────────────────────────────────────

def _resolve_location(req: BirthRequest):
    if req.city:
        try:
            return _engine.geocode_city(req.city)
        except Exception as e:
            raise HTTPException(422, f"都市の位置取得に失敗しました: {e}")
    if req.lat is not None and req.lon is not None and req.tz:
        return req.lat, req.lon, req.tz
    raise HTTPException(422, "city または (lat + lon + tz) のどちらかが必須です")


def _build_natal(req: BirthRequest):
    lat, lon, tz = _resolve_location(req)
    birth_dt = datetime(req.year, req.month, req.day, req.hour, req.minute)
    try:
        natal = _engine.calc_natal(birth_dt, lat, lon, tz, house_system=req.house_system)
    except Exception as e:
        raise HTTPException(500, f"チャート計算エラー: {e}")
    return natal, birth_dt, lat, lon, tz


def _build_chart_response(natal: dict, birth_dt: datetime, lat: float, lon: float) -> dict:
    summary   = _engine.calc_summary(natal)
    dignities = calc_all_dignities(natal["planets"])
    rulers    = calc_ruler_analysis(natal)
    scoring   = calc_natal_score(natal, dignities)

    dig_map = {d["planet"]: d for d in dignities}
    planets_out = {}
    for name, p in natal["planets"].items():
        entry = dict(p)
        d = dig_map.get(name)
        entry["dignity"]       = d["dignity"] if d else None
        entry["dignity_score"] = d["score"]   if d else None
        planets_out[name] = entry

    return {
        "birth_dt":           birth_dt.isoformat(),
        "lat":                lat,
        "lon":                lon,
        "tz":                 natal["tz"],
        "jd":                 natal["jd"],
        "planets":            planets_out,
        "houses":             natal["houses"],
        "aspects":            natal["aspects"],
        "summary":            summary,
        "rulers":             rulers,
        "total_score":        scoring["total_score"],
        "score_label":        scoring["score_label"],
        "score_message":      scoring["score_message"],
        "score_breakdown":    scoring["breakdown"],
        "strong_points":      scoring["strong_points"],
        "challenging_points": scoring["challenging_points"],
    }


# ── エンドポイント ────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/reading")
def post_reading(req: ReadingRequest):
    """
    ネイタル・トランジット・プログレッション・ソーラーアーク・ソーラーリターンを
    1回の呼び出しでまとめて返す。ネイタル計算は1回のみ。
    """
    natal, birth_dt, lat, lon, tz = _build_natal(req.person)

    try:
        current_dt = datetime.fromisoformat(req.current_dt)
    except ValueError:
        raise HTTPException(422, "current_dt は ISO8601 形式で指定してください")

    now    = datetime.now()
    chart  = _build_chart_response(natal, birth_dt, lat, lon)
    events = calc_transit_calendar(_engine, natal, now, days=req.transit_days)
    current_planets = calc_current_transit_positions(_engine, now)
    retro_periods = calc_retrograde_periods(_engine, now, days=req.transit_days)
    prog   = calc_secondary_progression(_engine, natal, birth_dt, current_dt, lat, lon, tz)
    sa     = calc_solar_arc(_engine, natal, birth_dt, current_dt)

    try:
        sr      = calc_solar_return(_engine, natal, req.sr_year, lat, lon, tz)
        sr_asps = calc_sr_aspects_to_natal(_engine, sr["sr_natal"], natal)
    except Exception as e:
        raise HTTPException(500, f"ソーラーリターン計算エラー: {e}")

    return {
        "chart":      chart,
        "transit":    {"events": events, "current_planets": current_planets, "retro_periods": retro_periods},
        "progression": prog,
        "solar_arc":   sa,
        "solar_return": {
            "sr_chart":            _build_chart_response(sr["sr_natal"], sr["sr_dt"], lat, lon),
            "sr_dt":               sr["sr_dt"].isoformat(),
            "sr_jd":               sr["sr_jd"],
            "natal_sun_long":      sr["natal_sun_long"],
            "sr_aspects_to_natal": sr_asps,
        },
    }


@app.post("/synastry")
def post_synastry(req: SynastryRequest):
    """
    2人のシナストリー（相性）を計算する。
    インターアスペクト・コンポジットチャート・相性スコアを返す。
    """
    natal_a, birth_dt_a, lat_a, lon_a, _ = _build_natal(req.person_a)
    natal_b, birth_dt_b, lat_b, lon_b, _ = _build_natal(req.person_b)

    syn = calc_synastry(_engine, natal_a, natal_b)

    return {
        "person_a":      _build_chart_response(natal_a, birth_dt_a, lat_a, lon_a),
        "person_b":      _build_chart_response(natal_b, birth_dt_b, lat_b, lon_b),
        "inter_aspects": syn["inter_aspects"],
        "composite":     syn["composite"],
        "score":         syn["score"],
    }
