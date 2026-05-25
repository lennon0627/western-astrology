"""
エッセンシャル・ディグニティ（品位）と支配星分析
Western astrology: Domicile / Exaltation / Detriment / Fall / Peregrine
"""
from __future__ import annotations
from typing import Dict, List

from engine.calculator import ZODIAC_SIGNS

# ── 品位テーブル ─────────────────────────────────────────────────────────────

# ドミサイル（支配サイン）: 伝統的ルーラーシップ
DOMICILE: Dict[str, List[str]] = {
    "Sun":     ["Leo"],
    "Moon":    ["Cancer"],
    "Mercury": ["Gemini", "Virgo"],
    "Venus":   ["Taurus", "Libra"],
    "Mars":    ["Aries", "Scorpio"],
    "Jupiter": ["Sagittarius", "Pisces"],
    "Saturn":  ["Capricorn", "Aquarius"],
}

# エグザルテーション（高揚）
EXALTATION: Dict[str, str] = {
    "Sun":     "Aries",
    "Moon":    "Taurus",
    "Mercury": "Virgo",
    "Venus":   "Pisces",
    "Mars":    "Capricorn",
    "Jupiter": "Cancer",
    "Saturn":  "Libra",
}

def _opposite_sign(s: str) -> str:
    return ZODIAC_SIGNS[(ZODIAC_SIGNS.index(s) + 6) % 12]


# デトリメント（ドミサイルの対向）
DETRIMENT: Dict[str, List[str]] = {
    planet: [_opposite_sign(s) for s in signs]
    for planet, signs in DOMICILE.items()
}

# フォール（エグザルテーションの対向）
FALL: Dict[str, str] = {
    planet: _opposite_sign(sign)
    for planet, sign in EXALTATION.items()
}

# ── 各サインの伝統的支配星 ────────────────────────────────────────────────────
SIGN_RULER: Dict[str, str] = {
    "Aries":       "Mars",
    "Taurus":      "Venus",
    "Gemini":      "Mercury",
    "Cancer":      "Moon",
    "Leo":         "Sun",
    "Virgo":       "Mercury",
    "Libra":       "Venus",
    "Scorpio":     "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn":   "Saturn",
    "Aquarius":    "Saturn",
    "Pisces":      "Jupiter",
}

# ── 品位スコア ────────────────────────────────────────────────────────────────
DIGNITY_SCORE: Dict[str, int] = {
    "domicile":   5,
    "exaltation": 4,
    "peregrine":  0,
    "fall":      -4,
    "detriment": -5,
}


def get_dignity(planet: str, sign: str) -> str:
    """天体とサインから品位を返す"""
    if planet not in DOMICILE:
        return "peregrine"
    if sign in DOMICILE[planet]:
        return "domicile"
    if EXALTATION.get(planet) == sign:
        return "exaltation"
    if sign in DETRIMENT.get(planet, []):
        return "detriment"
    if FALL.get(planet) == sign:
        return "fall"
    return "peregrine"


def calc_all_dignities(planets: Dict) -> List[Dict]:
    """全天体の品位を一覧で返す"""
    SKIP = {"ASC", "MC", "NNode", "SNode", "Fortune"}
    results = []
    for pname, p in planets.items():
        if pname in SKIP:
            continue
        sign = p.get("sign", "")
        if not sign:
            continue
        dignity = get_dignity(pname, sign)
        score   = DIGNITY_SCORE.get(dignity, 0)
        results.append({
            "planet":    pname,
            "sign":      sign,
            "sign_jp":   p.get("sign_jp", sign),
            "house":     p.get("house", "?"),
            "dignity":   dignity,
            "score":     score,
            "retrograde": p.get("retrograde", False),
        })
    return results


def calc_ruler_analysis(natal: Dict) -> List[Dict]:
    """
    各ハウスの支配星とその配置を返す。
    例: 第1ハウスカスプが牡羊座 → 支配星=火星 → 火星が第5ハウスにある
    """
    houses  = natal["houses"]
    planets = natal["planets"]
    cusps   = houses["cusps"]  # len=12

    results = []
    for i in range(12):
        cusp_long  = cusps[i]
        sign_idx   = int(cusp_long / 30)
        cusp_sign  = ZODIAC_SIGNS[sign_idx]
        ruler_name = SIGN_RULER.get(cusp_sign, "")

        ruler_data = planets.get(ruler_name, {})
        ruler_sign  = ruler_data.get("sign", "")
        ruler_house = ruler_data.get("house", None)
        ruler_sign_jp = ruler_data.get("sign_jp", ruler_sign)
        retro = ruler_data.get("retrograde", False)

        dignity = get_dignity(ruler_name, ruler_sign) if ruler_name and ruler_sign else "peregrine"

        results.append({
            "house_num":    i + 1,
            "cusp_sign":    cusp_sign,
            "ruler":        ruler_name,
            "ruler_sign":   ruler_sign,
            "ruler_sign_jp": ruler_sign_jp,
            "ruler_house":  ruler_house,
            "dignity":      dignity,
            "retrograde":   retro,
        })
    return results
