"""
ソーラーリターン（太陽回帰）チャート計算
太陽が出生時の黄経に戻る瞬間を二分探索で精密計算し、
その時刻のフルチャートを返す。
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

import pytz
import swisseph as swe

from engine.calculator import WesternAstrologyEngine, ZODIAC_SIGNS, ASPECTS, HARD_ASPECTS, SOFT_ASPECTS
from engine import labels as L


def _sun_longitude(engine: WesternAstrologyEngine, jd: float) -> float:
    return engine.get_longitude(jd, swe.SUN)


def _signed_diff(jd: float, engine: WesternAstrologyEngine, target: float) -> float:
    """太陽黄経 − ターゲット黄経（−180〜+180）"""
    raw = (_sun_longitude(engine, jd) - target) % 360
    if raw > 180:
        raw -= 360
    return raw


def find_solar_return_jd(
    engine: WesternAstrologyEngine,
    natal_sun_long: float,
    approx_jd: float,
    tol: float = 1e-6,
    max_iter: int = 80,
) -> float:
    """
    approx_jd 付近で太陽が natal_sun_long に戻る瞬間（JD）を二分探索で求める。
    """
    # ±10日のウィンドウで符号反転を探す
    step = 0.5
    jd = approx_jd - 10
    prev_val = _signed_diff(jd, engine, natal_sun_long)

    jd_lo = jd_hi = None
    jd += step
    while jd <= approx_jd + 10:
        curr_val = _signed_diff(jd, engine, natal_sun_long)
        if prev_val * curr_val < 0 and abs(prev_val - curr_val) < 30:
            jd_lo = jd - step
            jd_hi = jd
            break
        prev_val = curr_val
        jd += step

    if jd_lo is None:
        return approx_jd  # フォールバック

    # 二分探索で精密化
    for _ in range(max_iter):
        if jd_hi - jd_lo < tol:
            break
        mid = (jd_lo + jd_hi) / 2.0
        f_lo  = _signed_diff(jd_lo, engine, natal_sun_long)
        f_mid = _signed_diff(mid,   engine, natal_sun_long)
        if f_lo * f_mid <= 0:
            jd_hi = mid
        else:
            jd_lo = mid

    return (jd_lo + jd_hi) / 2.0


def calc_solar_return(
    engine: WesternAstrologyEngine,
    natal: Dict,
    year: int,
    lat: float,
    lon: float,
    tz_str: str,
) -> Dict:
    """
    指定年のソーラーリターンチャートを返す。

    Returns
    -------
    dict with keys:
        sr_natal    : calc_natal() と同じ構造のチャート辞書
        sr_dt       : ソーラーリターンの日時（UTC datetime）
        sr_jd       : ソーラーリターンのユリウス日
        natal_sun_long : 出生時の太陽黄経
    """
    natal_sun_long = natal["planets"]["Sun"]["longitude"]
    birth_jd       = natal["jd"]

    # 近似JD: 出生JD + 年数 × 365.25
    from datetime import datetime
    birth_dt_utc = engine.jd_to_dt(birth_jd)
    years_diff   = year - birth_dt_utc.year
    approx_jd    = birth_jd + years_diff * 365.25

    # 精密化
    sr_jd = find_solar_return_jd(engine, natal_sun_long, approx_jd)

    # SR チャートを計算（指定緯度経度）
    sr_dt  = engine.jd_to_dt(sr_jd)
    # ローカル datetime に変換してから calc_natal へ
    tz = pytz.timezone(tz_str)
    sr_dt_local = sr_dt.astimezone(tz).replace(tzinfo=None)

    sr_chart = engine.calc_natal(sr_dt_local, lat, lon, tz_str, house_system="P")
    sr_chart["name"] = "ソーラーリターン"

    return {
        "sr_natal":        sr_chart,
        "sr_dt":           sr_dt,
        "sr_jd":           sr_jd,
        "natal_sun_long":  natal_sun_long,
    }


def calc_sr_aspects_to_natal(
    engine: WesternAstrologyEngine,
    sr_natal: Dict,
    natal: Dict,
) -> list:
    """SR天体 vs ネイタル天体のアスペクトを計算（オーブ3°以内）"""
    SKIP = {"NNode", "SNode", "Fortune"}
    aspects = []
    for sr_name, sr_data in sr_natal["planets"].items():
        if sr_name in SKIP:
            continue
        for n_name, n_data in natal["planets"].items():
            if n_name in SKIP:
                continue
            diff = abs(sr_data["longitude"] - n_data["longitude"]) % 360
            if diff > 180:
                diff = 360 - diff
            for asp_name, (angle, orb) in ASPECTS.items():
                if asp_name not in ("Conjunction", "Opposition", "Square", "Trine", "Sextile"):
                    continue
                actual_orb = abs(diff - angle)
                if actual_orb <= min(orb, 3.0):
                    aspects.append({
                        "sr_planet":    sr_name,
                        "natal_planet": n_name,
                        "sr_planet_jp": L.planet(sr_name, short=True),
                        "natal_planet_jp": L.planet(n_name, short=True),
                        "aspect":       asp_name,
                        "aspect_jp":    L.aspect(asp_name),
                        "orb":          round(actual_orb, 2),
                        "type":         ("ハード" if asp_name in HARD_ASPECTS
                                         else "ソフト" if asp_name in SOFT_ASPECTS
                                         else "中性"),
                        "label": f'SR.{L.planet(sr_name, short=True)} {L.aspect(asp_name)} N.{L.planet(n_name, short=True)}',
                    })
    aspects.sort(key=lambda x: x["orb"])
    return aspects
