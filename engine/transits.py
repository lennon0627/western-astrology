"""
トランジット・カレンダー
現在〜1年間の「トランジット天体 vs ネイタル天体」のアスペクトが
ジャスト（オーブ0度）になる瞬間を秒単位で計算する。
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

import numpy as np
import swisseph as swe

from .calculator import (
    PLANET_IDS, ASPECTS, ZODIAC_SIGNS, PLANET_SYMBOLS,
    HARD_ASPECTS, SOFT_ASPECTS, WesternAstrologyEngine,
)
from . import labels as L

# トランジット計算対象惑星（月は高速）
TRANSIT_PLANETS = {
    "Moon":    (swe.MOON,    0.08),   # ~2時間ステップ
    "Sun":     (swe.SUN,     0.5),
    "Mercury": (swe.MERCURY, 0.5),
    "Venus":   (swe.VENUS,   0.5),
    "Mars":    (swe.MARS,    0.5),
    "Jupiter": (swe.JUPITER, 2.0),
    "Saturn":  (swe.SATURN,  2.0),
    "Uranus":  (swe.URANUS,  5.0),
    "Neptune": (swe.NEPTUNE, 5.0),
    "Pluto":   (swe.PLUTO,   5.0),
}

# メジャーアスペクトのみ（重要度順）
MAJOR_ASPECTS = {k: v for k, v in ASPECTS.items()
                 if k in ("Conjunction", "Opposition", "Square", "Trine", "Sextile",
                          "Quincunx", "Sesquiquadrate")}

# 重要度スコア（天体・アスペクトの組み合わせ）
PLANET_WEIGHT = {
    "Sun": 5, "Moon": 5, "ASC": 5, "MC": 5,
    "Mercury": 3, "Venus": 3, "Mars": 3,
    "Jupiter": 4, "Saturn": 4,
    "Uranus": 3, "Neptune": 3, "Pluto": 4,
    "NNode": 2,
}

# ネイタル側でトランジット計算の対象外にする天体
_NATAL_SKIP = {"SNode", "Fortune"}
ASPECT_WEIGHT = {
    "Conjunction": 5, "Opposition": 4, "Square": 4,
    "Trine": 3, "Sextile": 3, "Quincunx": 2, "Sesquiquadrate": 2,
}

SPECIAL_EVENTS = L.SPECIAL_EVENTS_JP


def _signed_orb(transit_long: float, natal_long: float, aspect_angle: float) -> float:
    """
    トランジット天体が natal_long から aspect_angle 離れた地点にどれだけ近いかを示す
    符号付きオーブ（-180〜+180）。0に近いほど exact。
    """
    raw = (transit_long - natal_long - aspect_angle) % 360
    if raw > 180:
        raw -= 360
    return raw


def _find_exact_transit(
    engine: WesternAstrologyEngine,
    planet_id: int,
    natal_long: float,
    aspect_angle: float,
    jd_lo: float,
    jd_hi: float,
    tol: float = 1e-6,   # ユリウス日精度 (≈ 0.086 秒)
    max_iter: int = 60,
) -> Optional[float]:
    """
    bisection法でアスペクトが exact になるJDを求める。
    [jd_lo, jd_hi] の間に符号反転があることが前提。
    """
    f_lo = _signed_orb(engine.get_longitude(jd_lo, planet_id), natal_long, aspect_angle)
    f_hi = _signed_orb(engine.get_longitude(jd_hi, planet_id), natal_long, aspect_angle)

    if f_lo * f_hi > 0:
        return None  # 符号反転なし

    for _ in range(max_iter):
        jd_mid = (jd_lo + jd_hi) / 2.0
        if jd_hi - jd_lo < tol:
            break
        f_mid = _signed_orb(
            engine.get_longitude(jd_mid, planet_id), natal_long, aspect_angle
        )
        if f_lo * f_mid <= 0:
            jd_hi = jd_mid
            f_hi = f_mid
        else:
            jd_lo = jd_mid
            f_lo = f_mid

    return (jd_lo + jd_hi) / 2.0


def calc_current_transit_positions(
    engine: WesternAstrologyEngine,
    current_dt: datetime,
) -> Dict[str, float]:
    """
    current_dt 時点の各トランジット天体の黄経（度数）を返す。
    フロントエンドのビホイール外リング表示用。

    Returns
    -------
    {"Sun": 123.45, "Moon": 234.56, ...}  ← 0〜360 の黄経
    """
    try:
        jd = engine.local_dt_to_jd(current_dt, "UTC")
    except Exception:
        jd = engine.local_dt_to_jd(current_dt.replace(tzinfo=None), "UTC")

    return {
        name: round(engine.get_longitude(jd, planet_id), 4)
        for name, (planet_id, _) in TRANSIT_PLANETS.items()
    }


def calc_retrograde_periods(
    engine: WesternAstrologyEngine,
    start_dt: datetime,
    days: int = 365,
) -> List[Dict]:
    """
    start_dt から days 日間の各惑星の逆行期間を返す。
    Sun/Moon は逆行しないため除外。
    """
    RETRO_PLANETS = {
        "Mercury": (swe.MERCURY, 1.0),
        "Venus":   (swe.VENUS,   1.0),
        "Mars":    (swe.MARS,    2.0),
        "Jupiter": (swe.JUPITER, 3.0),
        "Saturn":  (swe.SATURN,  3.0),
        "Uranus":  (swe.URANUS,  7.0),
        "Neptune": (swe.NEPTUNE, 7.0),
        "Pluto":   (swe.PLUTO,   7.0),
    }

    try:
        start_jd = engine.local_dt_to_jd(start_dt, "UTC")
    except Exception:
        start_jd = engine.local_dt_to_jd(start_dt.replace(tzinfo=None), "UTC")
    end_jd = start_jd + days

    results: List[Dict] = []

    for name, (planet_id, step) in RETRO_PLANETS.items():
        jd_arr = np.arange(start_jd, end_jd + step, step)

        speeds = []
        for jd in jd_arr:
            try:
                res, _ = swe.calc_ut(float(jd), planet_id, swe.FLG_MOSEPH)
                speeds.append(res[3])
            except Exception:
                speeds.append(0.0)

        is_retro = np.array(speeds) < 0

        # 逆行区間をグループとして抽出
        i = 0
        while i < len(is_retro):
            if is_retro[i]:
                retro_start = float(jd_arr[i])
                j = i + 1
                while j < len(is_retro) and is_retro[j]:
                    j += 1
                retro_end = float(jd_arr[j]) if j < len(jd_arr) else end_jd
                results.append({
                    "planet": name,
                    "start":  engine.jd_to_dt(retro_start).isoformat(),
                    "end":    engine.jd_to_dt(retro_end).isoformat(),
                })
                i = j
            else:
                i += 1

    return sorted(results, key=lambda x: x["start"])


def calc_transit_calendar(
    engine: WesternAstrologyEngine,
    natal: Dict,
    start_dt: datetime,
    days: int = 365,
) -> List[Dict]:
    """
    start_dt から days 日間のトランジット・アスペクト一覧を返す。

    Parameters
    ----------
    natal    : calc_natal() の戻り値
    start_dt : 計算開始日時（タイムゾーンなしはUTCとみなす）
    days     : 計算日数

    Returns
    -------
    list of dicts sorted by exact_dt
    """
    tz_str = natal.get("tz", "UTC")
    try:
        start_jd = engine.local_dt_to_jd(start_dt, tz_str)
    except Exception:
        import pytz
        start_jd = engine.local_dt_to_jd(
            start_dt.replace(tzinfo=None), "UTC"
        )
    end_jd = start_jd + days

    natal_planets = natal["planets"]
    results: List[Dict] = []

    for t_name, (t_id, step) in TRANSIT_PLANETS.items():
        # トランジット天体の黄経を全ステップ分一括計算
        jd_arr = np.arange(start_jd, end_jd + step, step)
        long_arr = np.array([engine.get_longitude(jd, t_id) for jd in jd_arr])

        for n_name, n_data in natal_planets.items():
            if n_name in _NATAL_SKIP:
                continue
            natal_long = n_data["longitude"]

            for asp_name, (asp_angle, _) in MAJOR_ASPECTS.items():
                targets = [asp_angle]
                if asp_angle not in (0.0, 180.0):
                    targets.append(-asp_angle)

                for target_angle in targets:
                    # 符号付きオーブを一括計算してゼロクロスを検出
                    orbs = (long_arr - natal_long - target_angle) % 360
                    orbs = np.where(orbs > 180, orbs - 360, orbs)
                    sign_changes = np.where(
                        (np.diff(np.sign(orbs)) != 0) & (np.abs(np.diff(orbs)) < 30)
                    )[0]

                    for idx in sign_changes:
                        exact_jd = _find_exact_transit(
                            engine, t_id, natal_long, target_angle,
                            float(jd_arr[idx]), float(jd_arr[idx + 1])
                        )
                        if exact_jd is not None:
                            exact_dt = engine.jd_to_dt(exact_jd)
                            score = (
                                PLANET_WEIGHT.get(t_name, 1)
                                + PLANET_WEIGHT.get(n_name, 1)
                                + ASPECT_WEIGHT.get(asp_name, 1)
                            )
                            special = SPECIAL_EVENTS.get(
                                (t_name, n_name, asp_name), ""
                            )
                            t_jp = L.planet(t_name, short=True)
                            n_jp = L.planet(n_name, short=True)
                            a_jp = L.aspect(asp_name)
                            typ  = ("ハード" if asp_name in HARD_ASPECTS
                                    else "ソフト" if asp_name in SOFT_ASPECTS
                                    else "中性")
                            results.append({
                                "exact_dt":          exact_dt,
                                "exact_jd":          exact_jd,
                                "transit_planet":    t_name,
                                "natal_planet":      n_name,
                                "transit_planet_jp": t_jp,
                                "natal_planet_jp":   n_jp,
                                "aspect":            asp_name,
                                "aspect_jp":         a_jp,
                                "asp_angle":         asp_angle,
                                "score":             score,
                                "special":           special,
                                "type":              typ,
                                "label": (
                                    f"{PLANET_SYMBOLS.get(t_name, t_name)} "
                                    f"{t_jp} {a_jp} "
                                    f"{PLANET_SYMBOLS.get(n_name, n_name)} "
                                    f"{n_jp}"
                                ),
                            })

    # exact_dt でソート
    results.sort(key=lambda x: x["exact_jd"])
    return results
