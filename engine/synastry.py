"""
シナストリー（相性チャート）計算

- calc_synastry_aspects: 2チャート間のインターアスペクト
- calc_composite_chart : コンポジットチャート（中点法）
- calc_synastry_score  : 相性スコア (0〜100)
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from engine.calculator import (
    WesternAstrologyEngine,
    ASPECTS, ZODIAC_SIGNS, ZODIAC_SYMBOLS,
    HARD_ASPECTS, SOFT_ASPECTS,
)
from engine.scoring import PLANET_WEIGHT, ASPECT_HARMONY, _orb_weight
from engine import labels as L

# ── 定数 ────────────────────────────────────────────────────────────────────

# シナストリーで評価する天体セット
_KEY_PLANETS = {
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
    "ASC", "MC",
}
_SKIP = {"SNode", "Fortune", "NNode"}

# メジャーアスペクトのみ（シナストリーはマイナーを除く）
_SYN_ASPECTS = {k: v for k, v in ASPECTS.items() if k in (
    "Conjunction", "Opposition", "Square", "Trine",
    "Sextile", "Quincunx", "Sesquiquadrate",
)}

# 天体ペア別の重要度ボーナス（順不同）
_PAIR_BONUS: Dict[Tuple[str, str], float] = {
    ("Sun",     "Moon"):    3.0,  # 魂の共鳴（最重要）
    ("Venus",   "Mars"):    3.0,  # 恋愛・性的引力
    ("Moon",    "Moon"):    2.5,  # 感情的共鳴
    ("Sun",     "Venus"):   2.0,  # 愛情・調和
    ("Sun",     "ASC"):     2.0,  # 存在感・惹かれ合い
    ("Moon",    "Venus"):   2.0,  # 感情的なやさしさ
    ("Jupiter", "Sun"):     2.0,  # 成長・幸運
    ("Saturn",  "Moon"):    1.5,  # 責任・長期的絆
    ("Saturn",  "Sun"):     1.5,  # 試練・成長
    ("Venus",   "Jupiter"): 1.5,  # 喜び・豊かさ
    ("Mars",    "ASC"):     1.5,  # 活力・刺激
    ("Moon",    "ASC"):     1.5,  # 感情的な居心地
}

_SCORE_LABELS: List[Tuple[int, str, str]] = [
    (80, "大吉",  "非常に調和のとれた相性。深い絆と相互理解が期待できます。"),
    (65, "吉",    "バランスの良い相性。惹かれ合う要素が多く、長続きしやすい関係です。"),
    (45, "中吉",  "良い面と課題が混在する相性。お互いを理解し合う努力が報われます。"),
    (30, "中",    "挑戦的な要素が多め。意識的な対話と理解が関係を深めます。"),
    (0,  "要注意", "かなり挑戦的な相性。互いの違いを認め合うことが大切です。"),
]


def _pair_weight(p1: str, p2: str) -> float:
    """2天体ペアの重要度（順不同）"""
    bonus = (
        _PAIR_BONUS.get((p1, p2))
        or _PAIR_BONUS.get((p2, p1))
    )
    if bonus:
        return bonus
    return (PLANET_WEIGHT.get(p1, 1.0) + PLANET_WEIGHT.get(p2, 1.0)) / 4.0


def _syn_score_label(score: int) -> Tuple[str, str]:
    for threshold, label, msg in _SCORE_LABELS:
        if score >= threshold:
            return label, msg
    return _SCORE_LABELS[-1][1], _SCORE_LABELS[-1][2]


# ── メイン関数 ────────────────────────────────────────────────────────────

def calc_synastry_aspects(natal_a: Dict, natal_b: Dict) -> List[Dict]:
    """
    チャートA の天体 vs チャートB の天体のインターアスペクトを計算する。

    双方向（A→B と B→A）の結果を得るには、引数を入れ替えて2回呼ぶか、
    calc_synastry() を使う。

    Returns
    -------
    list of dicts, sorted by |score| desc (重要度順)
    """
    aspects = []
    planets_a = natal_a["planets"]
    planets_b = natal_b["planets"]

    for a_name, a_data in planets_a.items():
        if a_name in _SKIP or a_name not in _KEY_PLANETS:
            continue
        for b_name, b_data in planets_b.items():
            if b_name in _SKIP or b_name not in _KEY_PLANETS:
                continue

            diff = abs(a_data["longitude"] - b_data["longitude"]) % 360
            if diff > 180:
                diff = 360 - diff

            for asp_name, (angle, orb) in _SYN_ASPECTS.items():
                actual_orb = abs(diff - angle)
                if actual_orb > orb:
                    continue

                harmony  = ASPECT_HARMONY.get(asp_name, 0.0)
                pw       = _pair_weight(a_name, b_name)
                orb_w    = _orb_weight(actual_orb, orb)
                score    = harmony * pw * orb_w
                combo_desc = (
                    L.SYNASTRY_COMBO_JP.get((a_name, b_name))
                    or L.SYNASTRY_COMBO_JP.get((b_name, a_name), "")
                )

                aspects.append({
                    "planet_a":    a_name,
                    "planet_b":    b_name,
                    "planet_a_jp": L.planet(a_name, short=True),
                    "planet_b_jp": L.planet(b_name, short=True),
                    "aspect":      asp_name,
                    "aspect_jp":   L.aspect(asp_name),
                    "orb":         round(actual_orb, 2),
                    "type":        ("ハード" if asp_name in HARD_ASPECTS
                                    else "ソフト" if asp_name in SOFT_ASPECTS
                                    else "中性"),
                    "score":       round(score, 2),
                    "pair_weight": round(pw, 2),
                    "combo_desc":  combo_desc,
                    "label":       f'A.{L.planet(a_name, short=True)} {L.aspect(asp_name)} B.{L.planet(b_name, short=True)}',
                })

    aspects.sort(key=lambda x: -abs(x["score"]))
    return aspects


def calc_composite_chart(
    engine: WesternAstrologyEngine,
    natal_a: Dict,
    natal_b: Dict,
) -> Dict:
    """
    コンポジットチャート（中点法）を計算する。

    各天体の黄経の最短弧上の中点を取り、仮想チャートを構築する。
    ハウスは天体の中点のみ（簡易版）。

    Returns
    -------
    {planets: {name: pos_dict}, aspects: [...]}
    """
    planets_a = natal_a["planets"]
    planets_b = natal_b["planets"]

    composite_planets: Dict[str, Dict] = {}
    for name in set(planets_a.keys()) & set(planets_b.keys()):
        if name in _SKIP:
            continue
        long_a = planets_a[name]["longitude"]
        long_b = planets_b[name]["longitude"]

        # 最短弧の中点
        diff = (long_b - long_a) % 360
        if diff > 180:
            diff -= 360
        mid_long = (long_a + diff / 2.0) % 360

        sn = int(mid_long / 30)
        d  = mid_long % 30
        sign_en = ZODIAC_SIGNS[sn]
        sign_jp = L.sign(sign_en)

        composite_planets[name] = {
            "name":        name,
            "name_jp":     L.planet(name, short=True),
            "longitude":   mid_long,
            "sign":        sign_en,
            "sign_jp":     sign_jp,
            "sign_num":    sn,
            "sign_symbol": ZODIAC_SYMBOLS[sn],
            "degree":      d,
            "degree_str":  f"{int(d)}°{int((d % 1) * 60):02d}' {sign_jp}",
            "retrograde":  False,
            "speed":       0.0,
            "latitude":    0.0,
        }

    # コンポジット天体間のアスペクト
    comp_aspects = []
    names = list(composite_planets.keys())
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            n1, n2 = names[i], names[j]
            res = engine.check_aspect(
                composite_planets[n1]["longitude"],
                composite_planets[n2]["longitude"],
            )
            if res:
                asp_name, orb = res
                comp_aspects.append({
                    "planet1":    n1,
                    "planet2":    n2,
                    "planet1_jp": L.planet(n1, short=True),
                    "planet2_jp": L.planet(n2, short=True),
                    "aspect":     asp_name,
                    "aspect_jp":  L.aspect(asp_name),
                    "orb":        round(orb, 2),
                    "type":       ("ハード" if asp_name in HARD_ASPECTS
                                   else "ソフト" if asp_name in SOFT_ASPECTS
                                   else "中性"),
                })

    return {
        "planets": composite_planets,
        "aspects": sorted(comp_aspects, key=lambda x: x["orb"]),
    }


def calc_synastry_score(aspects: List[Dict]) -> Dict:
    """
    シナストリーアスペクト一覧から相性スコアを計算する (0〜100)。

    Parameters
    ----------
    aspects : calc_synastry_aspects() の戻り値（双方向合算済みを推奨）

    Returns
    -------
    {total_score, score_label, score_message, top_aspects, challenging_aspects,
     score_breakdown: {soft_total, hard_total, key_aspects}}
    """
    if not aspects:
        return {
            "total_score":         50,
            "score_label":         "中",
            "score_message":       "判定できるアスペクトがありません。",
            "top_aspects":         [],
            "challenging_aspects": [],
            "score_breakdown":     {"soft_total": 0, "hard_total": 0, "key_aspects": []},
        }

    soft_total = sum(a["score"] for a in aspects if a["score"] > 0)
    hard_total = sum(a["score"] for a in aspects if a["score"] < 0)
    total_raw  = soft_total + hard_total

    # ±30 を基準に正規化
    normalized  = max(-1.0, min(1.0, total_raw / 30.0))
    total_score = int(round(50.0 + normalized * 50.0))
    total_score = max(0, min(100, total_score))

    label, message = _syn_score_label(total_score)

    top_aspects = sorted(
        [a for a in aspects if a["score"] > 0],
        key=lambda x: -x["score"],
    )[:6]
    challenging = sorted(
        [a for a in aspects if a["score"] < 0],
        key=lambda x: x["score"],
    )[:6]

    # 重要ペアのアスペクト抜粋
    key_aspects = [
        a for a in aspects
        if a["pair_weight"] >= 2.0
    ][:8]

    return {
        "total_score":         total_score,
        "score_label":         label,
        "score_message":       message,
        "top_aspects":         top_aspects,
        "challenging_aspects": challenging,
        "score_breakdown": {
            "soft_total":  round(soft_total, 2),
            "hard_total":  round(hard_total, 2),
            "key_aspects": key_aspects,
        },
    }


def calc_synastry(
    engine: WesternAstrologyEngine,
    natal_a: Dict,
    natal_b: Dict,
) -> Dict:
    """
    シナストリー計算のワンストップ関数。

    Returns
    -------
    {inter_aspects, composite, score}
    """
    all_aspects = calc_synastry_aspects(natal_a, natal_b)

    return {
        "inter_aspects": all_aspects,
        "composite":     calc_composite_chart(engine, natal_a, natal_b),
        "score":         calc_synastry_score(all_aspects),
    }
