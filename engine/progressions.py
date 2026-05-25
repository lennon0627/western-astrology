"""
セカンダリー・プログレッション（二次進行法 / 一日一年法）
生後N日目の天体配置 = 現在のプログレス配置（N = 年齢）
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List

from .calculator import (
    PLANET_IDS, ASPECTS, ZODIAC_SIGNS, PLANET_SYMBOLS,
    HARD_ASPECTS, WesternAstrologyEngine,
)
from . import labels as L

PROG_ASPECTS = {k: v for k, v in ASPECTS.items()
                if k in ("Conjunction", "Opposition", "Square", "Trine", "Sextile", "Quincunx")}


def _age_in_years(birth_dt: datetime, current_dt: datetime) -> float:
    delta = current_dt - birth_dt.replace(tzinfo=None)
    return delta.total_seconds() / (365.25 * 86400)


def calc_secondary_progression(
    engine: WesternAstrologyEngine,
    natal: Dict,
    birth_dt: datetime,
    current_dt: datetime,
    lat: float,
    lon: float,
    tz_str: str,
) -> Dict:
    """
    プログレスチャートを計算する。
    一日一年法: プログレスJD = 出生JD + 年齢(年)

    Returns
    -------
    {
        'prog_planets': {planet_name: pos_dict},
        'prog_asc': float,
        'prog_mc': float,
        'aspects_to_natal': [...]
    }
    """
    birth_jd = natal["jd"]
    age_years = _age_in_years(birth_dt, current_dt)
    prog_jd = birth_jd + age_years  # 1日 = 1年

    # プログレス天体位置
    prog_planets: Dict[str, Dict] = {}
    for name, pid in PLANET_IDS.items():
        try:
            p = engine.get_planet_position(prog_jd, pid)
            p["name"] = name
            prog_planets[name] = p
        except Exception:
            pass

    # プログレスASC/MC
    try:
        prog_houses = engine.get_houses(prog_jd, lat, lon)
        prog_asc = prog_houses["asc"]
        prog_mc = prog_houses["mc"]
        for pname, long_ in [("ASC", prog_asc), ("MC", prog_mc)]:
            sn = int(long_ / 30)
            d = long_ % 30
            sign_jp = L.sign(ZODIAC_SIGNS[sn])
            prog_planets[pname] = {
                "name": pname, "longitude": long_, "latitude": 0.0,
                "speed": 0.0, "retrograde": False,
                "sign": ZODIAC_SIGNS[sn], "sign_jp": sign_jp, "sign_num": sn,
                "degree": d,
                "degree_str": f"{int(d)}°{int((d%1)*60):02d}' {sign_jp}",
            }
    except Exception:
        prog_asc = prog_mc = None

    # プログレス天体 vs ネイタル天体のアスペクト
    natal_planets = natal["planets"]
    aspects_to_natal: List[Dict] = []
    for p_name, p_data in prog_planets.items():
        for n_name, n_data in natal_planets.items():
            res = engine.check_aspect(p_data["longitude"], n_data["longitude"])
            if res:
                asp_name, orb = res
                aspects_to_natal.append({
                    "prog_planet":    p_name,
                    "natal_planet":   n_name,
                    "prog_planet_jp": L.planet(p_name, short=True),
                    "natal_planet_jp": L.planet(n_name, short=True),
                    "aspect":         asp_name,
                    "aspect_jp":      L.aspect(asp_name),
                    "orb":            round(orb, 2),
                    "type":           "ハード" if asp_name in HARD_ASPECTS else "ソフト",
                    "label": (
                        f"P.{PLANET_SYMBOLS.get(p_name, p_name)} "
                        f"{L.planet(p_name, short=True)} "
                        f"{L.aspect(asp_name)} "
                        f"N.{PLANET_SYMBOLS.get(n_name, n_name)} "
                        f"{L.planet(n_name, short=True)}"
                    ),
                })
    aspects_to_natal.sort(key=lambda x: x["orb"])

    # プログレス月のサイン・ハウス移動予測（今後5年）
    prog_moon_timeline = _prog_moon_timeline(engine, prog_jd, natal, birth_jd, age_years)

    return {
        "prog_planets":      prog_planets,
        "prog_asc":          prog_asc,
        "prog_mc":           prog_mc,
        "aspects_to_natal":  aspects_to_natal,
        "age_years":         round(age_years, 2),
        "prog_jd":           prog_jd,
        "moon_timeline":     prog_moon_timeline,
    }


def _prog_moon_timeline(
    engine: WesternAstrologyEngine,
    prog_jd_now: float,
    natal: Dict,
    birth_jd: float,
    age_now: float,
    years_ahead: int = 5,
) -> List[Dict]:
    """
    プログレス月の今後5年のサイン・ハウス移動イベントを抽出。
    """
    import swisseph as swe

    events: List[Dict] = []
    moon_id = swe.MOON

    step = 1.0 / 12  # 1ヶ月単位 = 1/12日
    jd_end = prog_jd_now + years_ahead  # 5年 = 5日

    prev_long = engine.get_longitude(prog_jd_now, moon_id)
    prev_sign = int(prev_long / 30)
    in_conjunction: Dict[str, bool] = {}

    jd = prog_jd_now + step
    while jd <= jd_end:
        curr_long = engine.get_longitude(jd, moon_id)
        curr_sign = int(curr_long / 30)

        if curr_sign != prev_sign:
            exact_age = age_now + (jd - prog_jd_now)
            sign_jp = L.sign(ZODIAC_SIGNS[curr_sign])
            events.append({
                "type":    "サイン移行",
                "planet":  "プログレス月",
                "detail":  f"☽ プログレス月 → {sign_jp}へ移行",
                "prog_jd": jd,
                "age":     round(exact_age, 2),
                "future_years": round(jd - prog_jd_now, 2),
            })

        # ネイタル天体とのコンジャンクション（オーブ1°以内）
        # in_conjunction で「ゾーン内に入った瞬間」だけ記録（連続ステップ重複防止）
        for n_name, n_data in natal["planets"].items():
            diff = abs(curr_long - n_data["longitude"]) % 360
            if diff > 180:
                diff = 360 - diff
            was_in = in_conjunction.get(n_name, False)
            if diff < 1.0:
                if not was_in:
                    exact_age = age_now + (jd - prog_jd_now)
                    events.append({
                        "type":    "合",
                        "planet":  "プログレス月",
                        "detail":  f"☽ プログレス月 合 ネイタル{L.planet(n_name, short=True)} (orb {diff:.1f}°)",
                        "prog_jd": jd,
                        "age":     round(exact_age, 2),
                        "future_years": round(jd - prog_jd_now, 2),
                    })
                in_conjunction[n_name] = True
            else:
                in_conjunction[n_name] = False

        prev_long = curr_long
        prev_sign = curr_sign
        jd += step

    return events
