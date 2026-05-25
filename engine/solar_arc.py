"""
ソーラーアーク・ディレクション（太陽弧進行）
全天体を「プログレス太陽 − ネイタル太陽」だけ進め、
ネイタル天体と重なる具体的イベント期を計算する。
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List

import swisseph as swe

from .calculator import (
    PLANET_IDS, ASPECTS, ZODIAC_SIGNS, PLANET_SYMBOLS,
    HARD_ASPECTS, WesternAstrologyEngine,
)
from . import labels as L

SA_ASPECTS = {k: v for k, v in ASPECTS.items()
              if k in ("Conjunction", "Opposition", "Square", "Trine", "Sextile")}

_SKIP = {"SNode", "Fortune"}


def _age_in_years(birth_dt: datetime, current_dt: datetime) -> float:
    delta = current_dt.replace(tzinfo=None) - birth_dt.replace(tzinfo=None)
    return delta.total_seconds() / (365.25 * 86400)


def calc_solar_arc(
    engine: WesternAstrologyEngine,
    natal: Dict,
    birth_dt: datetime,
    current_dt: datetime,
) -> Dict:
    """
    現在のソーラーアーク天体配置を計算し、
    ネイタル天体とのアスペクト（オーブ1°以内）を抽出する。

    ソーラーアーク = プログレス太陽度数 − ネイタル太陽度数
    SA天体 = ネイタル天体 + ソーラーアーク
    """
    birth_jd = natal["jd"]
    age_years = _age_in_years(birth_dt, current_dt)
    prog_jd = birth_jd + age_years  # 一日一年

    natal_sun_long = natal["planets"]["Sun"]["longitude"]
    prog_sun_long = engine.get_longitude(prog_jd, swe.SUN)

    solar_arc = (prog_sun_long - natal_sun_long) % 360

    # SA天体配置
    sa_planets: Dict[str, Dict] = {}
    natal_planets = natal["planets"]
    for name, n_data in natal_planets.items():
        if name in _SKIP:
            continue
        sa_long = (n_data["longitude"] + solar_arc) % 360
        sn = int(sa_long / 30)
        d = sa_long % 30
        sign_en = ZODIAC_SIGNS[sn]
        sign_jp = L.sign(sign_en)
        sa_planets[name] = {
            "name":       name,
            "name_jp":    L.planet(name, short=True),
            "longitude":  sa_long,
            "sign":       sign_en,
            "sign_jp":    sign_jp,
            "sign_num":   sn,
            "degree":     d,
            "degree_str": f"{int(d)}°{int((d%1)*60):02d}' {sign_jp}",
            "natal_long": n_data["longitude"],
        }

    # SA天体 vs ネイタル天体のアスペクト（オーブ2°以内）
    aspects_to_natal: List[Dict] = []
    for sa_name, sa_data in sa_planets.items():
        if sa_name in _SKIP:
            continue
        for n_name, n_data in natal_planets.items():
            if n_name in _SKIP or sa_name == n_name:
                continue
            diff = abs(sa_data["longitude"] - n_data["longitude"]) % 360
            if diff > 180:
                diff = 360 - diff

            for asp_name, (angle, orb) in SA_ASPECTS.items():
                orb_sa = min(orb, 2.0)  # SAは厳しいオーブ
                if abs(diff - angle) <= orb_sa:
                    actual_orb = abs(diff - angle)
                    aspects_to_natal.append({
                        "sa_planet":      sa_name,
                        "natal_planet":   n_name,
                        "sa_planet_jp":   L.planet(sa_name, short=True),
                        "natal_planet_jp": L.planet(n_name, short=True),
                        "aspect":         asp_name,
                        "aspect_jp":      L.aspect(asp_name),
                        "orb":            round(actual_orb, 2),
                        "type":           "ハード" if asp_name in HARD_ASPECTS else "ソフト",
                        "solar_arc":      round(solar_arc, 2),
                        "label": (
                            f"SA.{PLANET_SYMBOLS.get(sa_name, sa_name)} "
                            f"{L.planet(sa_name, short=True)} "
                            f"{L.aspect(asp_name)} "
                            f"N.{PLANET_SYMBOLS.get(n_name, n_name)} "
                            f"{L.planet(n_name, short=True)}"
                        ),
                    })
    aspects_to_natal.sort(key=lambda x: x["orb"])

    # 今後5年のソーラーアーク・イベント予測
    future_events = _sa_future_events(engine, natal, birth_jd, age_years)

    return {
        "sa_planets":       sa_planets,
        "solar_arc":        round(solar_arc, 2),
        "aspects_to_natal": aspects_to_natal,
        "age_years":        round(age_years, 2),
        "future_events":    future_events,
    }


def _sa_future_events(
    engine: WesternAstrologyEngine,
    natal: Dict,
    birth_jd: float,
    age_now: float,
    years_ahead: float = 5.0,
) -> List[Dict]:
    """
    今後 years_ahead 年間（≒ solar_arc +years_ahead 度）に
    SA天体がネイタル天体と合・矩・対などを形成する時期を抽出。
    """
    events: List[Dict] = []
    natal_planets = natal["planets"]

    natal_sun = natal_planets["Sun"]["longitude"]

    step = 1.0 / 12  # 1ヶ月 ≈ 1/12年
    age_end = age_now + years_ahead

    age = age_now
    while age <= age_end:
        prog_jd = birth_jd + age
        prog_sun = engine.get_longitude(prog_jd, swe.SUN)
        sa = (prog_sun - natal_sun) % 360

        for sa_pname, n_data in natal_planets.items():
            if sa_pname in _SKIP:
                continue
            sa_long = (n_data["longitude"] + sa) % 360

            for n_name, n2_data in natal_planets.items():
                if n_name in _SKIP or sa_pname == n_name:
                    continue
                diff = abs(sa_long - n2_data["longitude"]) % 360
                if diff > 180:
                    diff = 360 - diff

                for asp_name, (angle, _) in SA_ASPECTS.items():
                    if abs(diff - angle) <= 0.5:
                        sa_jp = L.planet(sa_pname, short=True)
                        n_jp  = L.planet(n_name, short=True)
                        a_jp  = L.aspect(asp_name)
                        events.append({
                            "type":   f"SA {a_jp}",
                            "detail": f"SA.{sa_jp} {a_jp} ネイタル{n_jp}",
                            "age":    round(age, 2),
                            "future_years": round(age - age_now, 2),
                            "orb":    round(abs(diff - angle), 3),
                        })
        age += step

    # 重複削除
    seen = set()
    unique = []
    for e in sorted(events, key=lambda x: x["age"]):
        key = (e["detail"], round(e["age"], 1))
        if key not in seen:
            seen.add(key)
            unique.append(e)

    return unique
