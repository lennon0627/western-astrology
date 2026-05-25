"""
ネイタルチャート総合スコアリング

3つのコンポーネントを組み合わせて 0〜100 スコアに正規化する:
  1. エッセンシャルディグニティ (40%)
     domicile/exaltation/detriment/fall の天体ウェイト付き合計
  2. アクシデンタルディグニティ (25%)
     角ハウス（1/4/7/10）=強、終止ハウス（6/12）=弱 のハウス位置スコア
  3. アスペクト調和度 (35%)
     ソフトアスペクト(+) vs ハードアスペクト(-) の天体ウェイト付き合計
"""
from __future__ import annotations

from typing import Dict, List, Tuple

from engine.dignity import calc_all_dignities
from engine import labels as L

# ── 天体の重要度ウェイト ────────────────────────────────────────────────────
PLANET_WEIGHT: Dict[str, float] = {
    "Sun":     3.0,
    "Moon":    3.0,
    "Mercury": 2.0,
    "Venus":   2.0,
    "Mars":    2.0,
    "Jupiter": 1.5,
    "Saturn":  1.5,
    "Uranus":  1.0,
    "Neptune": 1.0,
    "Pluto":   1.0,
    "ASC":     2.5,
    "MC":      2.0,
}

# ── アクシデンタルディグニティ（ハウス位置の強さ）────────────────────────
# 角ハウス(1/4/7/10) > 継続ハウス(2/5/8/11) > 終止ハウス(3/6/9/12)
HOUSE_STRENGTH: Dict[int, float] = {
    1:  4.0, 10: 3.0, 7: 2.0, 4: 2.0,   # 角ハウス（最も力強い）
    2:  1.0, 5:  1.0, 11: 1.0,           # 継続ハウス（良）
    8:  0.0,                              # 継続ハウス（変容・中立）
    9:  0.0, 3: -0.5,                     # 終止ハウス（軽度）
    6: -2.0, 12: -2.0,                   # 終止ハウス（弱い）
}

# ── アスペクトの調和スコア ────────────────────────────────────────────────
ASPECT_HARMONY: Dict[str, float] = {
    "Trine":           3.0,
    "Sextile":         2.0,
    "Conjunction":     1.0,   # 天体依存だが全体では微陽性
    "Semi-Sextile":    0.5,
    "Quintile":        1.0,
    "Bi-Quintile":     1.0,
    "Opposition":     -2.0,
    "Square":         -2.0,
    "Quincunx":       -1.0,
    "Sesquiquadrate": -1.0,
}

# ── スコアラベル（閾値降順）──────────────────────────────────────────────
_SCORE_LABELS: List[Tuple[int, str, str]] = [
    (85, "大吉", "天賦の才に恵まれた、調和に満ちたチャートです。"),
    (70, "吉",   "バランスよく整ったチャート。才能を活かしやすい配置です。"),
    (55, "中吉", "課題と才能が共存するチャート。成長の可能性が豊かです。"),
    (40, "中",   "挑戦的な要素が目立ちますが、それが強さにもなります。"),
    (25, "小凶", "困難な配置が多め。試練を通じて魂が磨かれるチャートです。"),
    (0,  "凶",   "多くの課題を抱えるチャート。内省と意識的な取り組みが鍵です。"),
]

# スキップする天体（スコアリング対象外）
_SKIP = {"SNode", "Fortune", "NNode"}


def _orb_weight(orb: float, max_orb: float = 8.0) -> float:
    """オーブが小さいほど影響力が強い（linear decay: 1.0 → 0.0）"""
    return max(0.0, 1.0 - orb / max_orb)


def _score_label(score: int) -> Tuple[str, str]:
    for threshold, label, msg in _SCORE_LABELS:
        if score >= threshold:
            return label, msg
    return _SCORE_LABELS[-1][1], _SCORE_LABELS[-1][2]


# ── コンポーネント別計算 ──────────────────────────────────────────────────

def calc_dignity_component(natal: Dict, dignities: List[Dict]) -> Dict:
    """エッセンシャルディグニティコンポーネント (-1.0 〜 +1.0)"""
    raw = 0.0
    max_possible = 0.0
    strong, weak = [], []

    for d in dignities:
        if d["planet"] in _SKIP:
            continue
        w = PLANET_WEIGHT.get(d["planet"], 1.0)
        pts = d["score"] * w
        raw += pts
        max_possible += 5.0 * w  # domicile(5) × weight が理論最大

        if d["dignity"] in ("domicile", "exaltation"):
            strong.append({
                "planet_jp": L.planet(d["planet"], short=True),
                "detail":    f'{L.planet(d["planet"], short=True)}：{d["sign_jp"]} {L.dignity(d["dignity"], short=True)}',
                "pts":       round(pts, 1),
                "positive":  True,
            })
        elif d["dignity"] in ("detriment", "fall"):
            weak.append({
                "planet_jp": L.planet(d["planet"], short=True),
                "detail":    f'{L.planet(d["planet"], short=True)}：{d["sign_jp"]} {L.dignity(d["dignity"], short=True)}',
                "pts":       round(pts, 1),
                "positive":  False,
            })

    normalized = raw / max_possible if max_possible > 0 else 0.0
    return {
        "raw":        round(raw, 2),
        "normalized": round(max(-1.0, min(1.0, normalized)), 3),
        "strong":     strong,
        "weak":       weak,
    }


def calc_house_component(natal: Dict) -> Dict:
    """アクシデンタルディグニティ（ハウス位置）コンポーネント (-1.0 〜 +1.0)"""
    planets = natal["planets"]
    raw = 0.0
    max_possible = 0.0
    strong, weak = [], []

    for name, p in planets.items():
        if name in _SKIP:
            continue
        w = PLANET_WEIGHT.get(name, 1.0)
        house = p.get("house", 1)
        strength = HOUSE_STRENGTH.get(house, 0.0)
        pts = strength * w
        raw += pts
        max_possible += 4.0 * w  # H1(4) × weight が理論最大

        if strength >= 2.0:
            strong.append({
                "planet_jp": L.planet(name, short=True),
                "detail":    f'{L.planet(name, short=True)}：第{house}室（角ハウス）',
                "pts":       round(pts, 1),
                "positive":  True,
            })
        elif strength <= -2.0:
            weak.append({
                "planet_jp": L.planet(name, short=True),
                "detail":    f'{L.planet(name, short=True)}：第{house}室（弱いハウス）',
                "pts":       round(pts, 1),
                "positive":  False,
            })

    normalized = raw / max_possible if max_possible > 0 else 0.0
    return {
        "raw":        round(raw, 2),
        "normalized": round(max(-1.0, min(1.0, normalized)), 3),
        "strong":     strong,
        "weak":       weak,
    }


def calc_aspect_component(natal: Dict) -> Dict:
    """アスペクト調和度コンポーネント (-1.0 〜 +1.0)"""
    aspects = natal["aspects"]
    raw = 0.0
    strong, weak = [], []

    for asp in aspects:
        p1, p2 = asp["planet1"], asp["planet2"]
        if p1 in _SKIP or p2 in _SKIP:
            continue
        w1 = PLANET_WEIGHT.get(p1, 1.0)
        w2 = PLANET_WEIGHT.get(p2, 1.0)
        harmony = ASPECT_HARMONY.get(asp["aspect"], 0.0)
        orb_w = _orb_weight(asp["orb"])
        pts = harmony * (w1 + w2) / 2.0 * orb_w
        raw += pts

        entry = {
            "planet_jp": f'{L.planet(p1, short=True)}×{L.planet(p2, short=True)}',
            "detail":    f'{L.planet(p1, short=True)} {L.aspect(asp["aspect"])} {L.planet(p2, short=True)} (orb {asp["orb"]}°)',
            "pts":       round(pts, 1),
            "positive":  harmony > 0,
        }
        if harmony >= 2.0 and orb_w > 0.4:
            strong.append(entry)
        elif harmony <= -2.0 and orb_w > 0.4:
            weak.append(entry)

    # 実用的正規化: ±60 を最大値と想定
    normalized = max(-1.0, min(1.0, raw / 60.0))
    return {
        "raw":        round(raw, 2),
        "normalized": round(normalized, 3),
        "strong":     sorted(strong, key=lambda x: -x["pts"])[:6],
        "weak":       sorted(weak,   key=lambda x: x["pts"])[:6],
    }


# ── メイン関数 ────────────────────────────────────────────────────────────

def calc_natal_score(natal: Dict, dignities: List[Dict]) -> Dict:
    """
    ネイタルチャート総合スコアを計算する。

    Parameters
    ----------
    natal      : WesternAstrologyEngine.calc_natal() の戻り値
    dignities  : calc_all_dignities() の戻り値

    Returns
    -------
    {
        total_score       : int (0-100),
        score_label       : str,
        score_message     : str,
        breakdown         : {dignity, house, aspect},
        strong_points     : list,
        challenging_points: list,
    }
    """
    dig   = calc_dignity_component(natal, dignities)
    house = calc_house_component(natal)
    asp   = calc_aspect_component(natal)

    # 重み付き合算 → -1.0〜+1.0 → 0〜100
    weighted = (
        dig["normalized"]   * 0.40 +
        house["normalized"] * 0.25 +
        asp["normalized"]   * 0.35
    )
    total_score = int(round(50.0 + weighted * 50.0))
    total_score = max(0, min(100, total_score))

    label, message = _score_label(total_score)

    # 強みポイント（上位5件）
    strong = sorted(
        dig["strong"] + house["strong"] + asp["strong"],
        key=lambda x: -x.get("pts", 0),
    )[:5]

    # 課題ポイント（下位5件）
    challenging = sorted(
        dig["weak"] + house["weak"] + asp["weak"],
        key=lambda x: x.get("pts", 0),
    )[:5]

    return {
        "total_score":        total_score,
        "score_label":        label,
        "score_message":      message,
        "breakdown": {
            "dignity": dig,
            "house":   house,
            "aspect":  asp,
        },
        "strong_points":      strong,
        "challenging_points": challenging,
    }
