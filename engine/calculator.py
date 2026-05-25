"""
WesternAstrologyEngine
Tropical / Placidus 西洋占星術 計算コアクラス
"""
from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import pytz
import swisseph as swe
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from timezonefinder import TimezoneFinder

from engine import labels as L

# ── 天体定数 ────────────────────────────────────────────────────────────────
PLANET_IDS: Dict[str, int] = {
    "Sun":     swe.SUN,
    "Moon":    swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus":   swe.VENUS,
    "Mars":    swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn":  swe.SATURN,
    "Uranus":  swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto":  swe.PLUTO,
    "NNode":  swe.MEAN_NODE,  # ノース・ノード（平均値）
}

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]

PLANET_SYMBOLS: Dict[str, str] = {
    "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀",
    "Mars": "♂", "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅",
    "Neptune": "♆", "Pluto": "♇",
    "NNode": "☊", "SNode": "☋", "Fortune": "⊕",
    "ASC": "AC", "MC": "MC",
}

PLANET_COLORS: Dict[str, str] = {
    "Sun": "#FFD700", "Moon": "#C0C0C0", "Mercury": "#90EE90",
    "Venus": "#FFB6C1", "Mars": "#FF4500", "Jupiter": "#FFA500",
    "Saturn": "#8B8682", "Uranus": "#87CEEB", "Neptune": "#9370DB",
    "Pluto": "#8B0000",
    "NNode": "#FFD700", "SNode": "#C0C0C0", "Fortune": "#FF69B4",
    "ASC": "#FFFFFF", "MC": "#FFFFFF",
}

ZODIAC_COLORS = [
    "#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3",
    "#F38181", "#6BCB77", "#4D96FF", "#845EC2",
    "#FF9671", "#00C9A7", "#2C73D2", "#FF6F91",
]

ELEMENT_MAP = {
    "Fire":  ["Aries", "Leo", "Sagittarius"],
    "Earth": ["Taurus", "Virgo", "Capricorn"],
    "Air":   ["Gemini", "Libra", "Aquarius"],
    "Water": ["Cancer", "Scorpio", "Pisces"],
}

MODALITY_MAP = {
    "Cardinal": ["Aries", "Cancer", "Libra", "Capricorn"],
    "Fixed":    ["Taurus", "Leo", "Scorpio", "Aquarius"],
    "Mutable":  ["Gemini", "Virgo", "Sagittarius", "Pisces"],
}

# オーブ: {アスペクト名: (角度, デフォルトオーブ)}
ASPECTS: Dict[str, Tuple[float, float]] = {
    "Conjunction":    (0.0,   8.0),
    "Sextile":        (60.0,  6.0),
    "Square":         (90.0,  8.0),
    "Trine":          (120.0, 8.0),
    "Opposition":     (180.0, 8.0),
    "Quincunx":       (150.0, 3.0),
    "Semi-Sextile":   (30.0,  2.0),
    "Sesquiquadrate": (135.0, 3.0),
    "Quintile":       (72.0,  2.0),
    "Bi-Quintile":    (144.0, 2.0),
}

ASPECT_COLORS: Dict[str, str] = {
    "Conjunction":    "#FFD700",
    "Sextile":        "#00FF7F",
    "Square":         "#FF4444",
    "Trine":          "#4488FF",
    "Opposition":     "#FF8800",
    "Quincunx":       "#AA44FF",
    "Semi-Sextile":   "#88FF88",
    "Sesquiquadrate": "#FF6600",
    "Quintile":       "#FF88FF",
    "Bi-Quintile":    "#FF66CC",
}

# ハードアスペクト判定
HARD_ASPECTS = {"Square", "Opposition", "Quincunx", "Sesquiquadrate"}
SOFT_ASPECTS = {"Sextile", "Trine", "Quintile", "Bi-Quintile"}

_tf = TimezoneFinder()


class WesternAstrologyEngine:
    """西洋占星術（Tropical / Placidus）計算エンジン"""

    def __init__(self, ephe_path: Optional[str] = None):
        """
        Parameters
        ----------
        ephe_path : .se1ファイルのディレクトリパス（省略時はMoshier内蔵暦を使用）
        """
        if ephe_path and os.path.isdir(ephe_path):
            swe.set_ephe_path(ephe_path)
        else:
            # Moshier モードにフォールバック（ファイル不要）
            swe.set_ephe_path(None)

    # ── 地理・時刻ユーティリティ ────────────────────────────────────────────

    def geocode_city(self, city_name: str) -> Tuple[float, float, str]:
        """都市名 → (緯度, 経度, タイムゾーン文字列)"""
        geolocator = Nominatim(user_agent="western_astro_app_v1", timeout=10)
        try:
            location = geolocator.geocode(city_name)
        except (GeocoderTimedOut, GeocoderUnavailable) as e:
            raise RuntimeError(f"ジオコーディングエラー: {e}") from e
        if location is None:
            raise ValueError(f"都市が見つかりません: {city_name}")
        tz_str = _tf.timezone_at(lat=location.latitude, lng=location.longitude)
        if tz_str is None:
            tz_str = "UTC"
        return location.latitude, location.longitude, tz_str

    def local_dt_to_jd(self, dt: datetime, tz_str: str) -> float:
        """ローカル datetime → ユリウス日（UT）"""
        tz = pytz.timezone(tz_str)
        if dt.tzinfo is None:
            dt_aware = tz.localize(dt)
        else:
            dt_aware = dt.astimezone(tz)
        dt_utc = dt_aware.astimezone(pytz.utc)
        return swe.julday(
            dt_utc.year, dt_utc.month, dt_utc.day,
            dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0,
        )

    def jd_to_dt(self, jd: float) -> datetime:
        """ユリウス日 → UTC datetime"""
        y, m, d, h = swe.revjul(jd)
        hour = int(h)
        minute = int((h - hour) * 60)
        second = int(((h - hour) * 60 - minute) * 60)
        return datetime(y, m, d, hour, minute, second, tzinfo=timezone.utc)

    # ── 天体位置計算 ────────────────────────────────────────────────────────

    def get_planet_position(self, jd: float, planet_id: int) -> Dict:
        """1天体のトロピカル度数・速度を返す"""
        flags = swe.FLG_MOSEPH | swe.FLG_SPEED
        result, _ = swe.calc_ut(jd, planet_id, flags)

        longitude = result[0] % 360
        speed = result[3]
        sign_num = int(longitude / 30)
        deg_in_sign = longitude % 30
        deg = int(deg_in_sign)
        min_ = int((deg_in_sign - deg) * 60)

        sign_en  = ZODIAC_SIGNS[sign_num]
        sign_jp  = L.sign(sign_en)
        return {
            "longitude":    longitude,
            "latitude":     result[1],
            "speed":        speed,
            "retrograde":   speed < 0,
            "sign":         sign_en,          # 内部ロジック用（英語キー）
            "sign_jp":      sign_jp,          # 表示用（日本語）
            "sign_num":     sign_num,
            "sign_symbol":  ZODIAC_SYMBOLS[sign_num],
            "degree":       deg_in_sign,
            "degree_str":   f"{deg}°{min_:02d}' {sign_jp}",
        }

    def get_houses(
        self, jd: float, lat: float, lon: float, system: str = "P"
    ) -> Dict:
        """
        Placidus ハウスシステム（高緯度フォールバック: Whole Sign）
        Returns: {cusps, asc, mc}
        """
        try:
            cusps, ascmc = swe.houses(jd, lat, lon, system.encode())
        except Exception:
            cusps, ascmc = swe.houses(jd, lat, lon, b"W")

        return {
            "cusps": list(cusps),   # cusps[0]=H1, cusps[11]=H12（len=12）
            "asc":   ascmc[0],
            "mc":    ascmc[1],
        }

    # ── ネイタルチャート計算 ────────────────────────────────────────────────

    def calc_natal(
        self,
        birth_dt: datetime,
        lat: float,
        lon: float,
        tz_str: str,
        house_system: str = "P",
    ) -> Dict:
        """
        完全なネイタルチャートを計算して返す。

        Returns
        -------
        dict with keys:
            planets, houses, aspects, jd, lat, lon, tz
        """
        jd = self.local_dt_to_jd(birth_dt, tz_str)

        # ハウス計算（ASC/MCを取得）
        houses = self.get_houses(jd, lat, lon, house_system)
        asc = houses["asc"]
        mc = houses["mc"]

        # 全天体計算
        planets: Dict[str, Dict] = {}
        for name, pid in PLANET_IDS.items():
            try:
                p = self.get_planet_position(jd, pid)
                p["name"] = name
                p["house"] = self._house_number(p["longitude"], houses["cusps"])
                planets[name] = p
            except Exception:
                pass

        # ASC / MC をポイントとして追加
        for pname, long_ in [("ASC", asc), ("MC", mc)]:
            sn = int(long_ / 30)
            d = long_ % 30
            sign_en = ZODIAC_SIGNS[sn]
            sign_jp = L.sign(sign_en)
            planets[pname] = {
                "name":        pname,
                "longitude":   long_,
                "latitude":    0.0,
                "speed":       0.0,
                "retrograde":  False,
                "sign":        sign_en,
                "sign_jp":     sign_jp,
                "sign_num":    sn,
                "sign_symbol": ZODIAC_SYMBOLS[sn],
                "degree":      d,
                "degree_str":  f"{int(d)}°{int((d%1)*60):02d}' {sign_jp}",
                "house":       self._house_number(long_, houses["cusps"]),
            }

        # サウス・ノード（ノース・ノードの正反対）
        if "NNode" in planets:
            nn_long = planets["NNode"]["longitude"]
            sn_long = (nn_long + 180.0) % 360
            sn_sn = int(sn_long / 30)
            sn_d  = sn_long % 30
            sn_sign_en = ZODIAC_SIGNS[sn_sn]
            sn_sign_jp = L.sign(sn_sign_en)
            planets["SNode"] = {
                "name":        "SNode",
                "longitude":   sn_long,
                "latitude":    0.0,
                "speed":       0.0,
                "retrograde":  False,
                "sign":        sn_sign_en,
                "sign_jp":     sn_sign_jp,
                "sign_num":    sn_sn,
                "sign_symbol": ZODIAC_SYMBOLS[sn_sn],
                "degree":      sn_d,
                "degree_str":  f"{int(sn_d)}°{int((sn_d%1)*60):02d}' {sn_sign_jp}",
                "house":       self._house_number(sn_long, houses["cusps"]),
            }

        # パート・オブ・フォーチュン（ASC + 月 − 太陽）
        if "ASC" in planets and "Moon" in planets and "Sun" in planets:
            pof_long = (asc + planets["Moon"]["longitude"] - planets["Sun"]["longitude"]) % 360
            pof_sn = int(pof_long / 30)
            pof_d  = pof_long % 30
            pof_sign_en = ZODIAC_SIGNS[pof_sn]
            pof_sign_jp = L.sign(pof_sign_en)
            planets["Fortune"] = {
                "name":        "Fortune",
                "longitude":   pof_long,
                "latitude":    0.0,
                "speed":       0.0,
                "retrograde":  False,
                "sign":        pof_sign_en,
                "sign_jp":     pof_sign_jp,
                "sign_num":    pof_sn,
                "sign_symbol": ZODIAC_SYMBOLS[pof_sn],
                "degree":      pof_d,
                "degree_str":  f"{int(pof_d)}°{int((pof_d%1)*60):02d}' {pof_sign_jp}",
                "house":       self._house_number(pof_long, houses["cusps"]),
            }

        aspects = self._calc_all_aspects(planets)

        return {
            "planets": planets,
            "houses":  houses,
            "aspects": aspects,
            "jd":      jd,
            "lat":     lat,
            "lon":     lon,
            "tz":      tz_str,
        }

    # ── アスペクト計算 ──────────────────────────────────────────────────────

    def _calc_all_aspects(self, planets: Dict) -> List[Dict]:
        aspects = []
        names = list(planets.keys())
        for i in range(len(names)):
            for j in range(i + 1, len(names)):
                n1, n2 = names[i], names[j]
                res = self.check_aspect(
                    planets[n1]["longitude"], planets[n2]["longitude"]
                )
                if res:
                    asp_name, orb = res
                    app = self._is_applying(planets[n1], planets[n2], ASPECTS[asp_name][0])
                    aspects.append({
                        "planet1":    n1,
                        "planet2":    n2,
                        "planet1_jp": L.planet(n1, short=True),
                        "planet2_jp": L.planet(n2, short=True),
                        "aspect":     asp_name,
                        "aspect_jp":  L.aspect(asp_name, short=True),
                        "orb":        round(orb, 2),
                        "angle":      ASPECTS[asp_name][0],
                        "applying":   app,
                        "applying_jp": L.applying(app),
                        "type":       ("ハード" if asp_name in HARD_ASPECTS
                                       else "ソフト" if asp_name in SOFT_ASPECTS
                                       else "中性"),
                    })
        return aspects

    def check_aspect(
        self, long1: float, long2: float
    ) -> Optional[Tuple[str, float]]:
        """2天体間のアスペクトを判定。(アスペクト名, オーブ) または None"""
        diff = abs(long1 - long2) % 360
        if diff > 180:
            diff = 360 - diff
        for name, (angle, orb) in ASPECTS.items():
            if abs(diff - angle) <= orb:
                return name, abs(diff - angle)
        return None

    def _is_applying(self, p1: Dict, p2: Dict, angle: float) -> bool:
        """アスペクトが形成中かどうか（approaching=True / separating=False）"""
        diff = (p1["longitude"] - p2["longitude"]) % 360
        if diff > 180:
            diff -= 360
        # 相対速度がアスペクト角度に近づいていれば applying
        rel_speed = p1.get("speed", 0) - p2.get("speed", 0)
        return (diff > 0 and rel_speed < 0) or (diff < 0 and rel_speed > 0)

    # ── ハウス番号判定 ──────────────────────────────────────────────────────

    def _house_number(self, longitude: float, cusps: List[float]) -> int:
        """
        cusps: pyswisseph の戻り値（len=12, cusps[0]=H1, cusps[11]=H12）
        """
        lon = longitude % 360
        for i in range(12):
            start = cusps[i] % 360
            end   = cusps[(i + 1) % 12] % 360

            if start < end:
                if start <= lon < end:
                    return i + 1
            else:
                # 0°をまたぐ
                if lon >= start or lon < end:
                    return i + 1
        return 1

    # ── サマリー計算 ────────────────────────────────────────────────────────

    def calc_summary(self, natal: Dict) -> Dict:
        """エレメント・モダリティバランスなどのサマリー"""
        planets = natal["planets"]
        elem_count = {e: 0 for e in ELEMENT_MAP}
        mod_count  = {m: 0 for m in MODALITY_MAP}

        EXCLUDE = {"ASC", "MC", "NNode", "SNode", "Fortune"}
        counted = [n for n in planets if n not in EXCLUDE]
        for name in counted:
            sign = planets[name]["sign"]
            for e, signs in ELEMENT_MAP.items():
                if sign in signs:
                    elem_count[e] += 1
            for m, signs in MODALITY_MAP.items():
                if sign in signs:
                    mod_count[m] += 1

        # 太陽・月・ASCサインの特徴
        sun_sign  = planets.get("Sun",  {}).get("sign", "")
        moon_sign = planets.get("Moon", {}).get("sign", "")
        asc_sign  = planets.get("ASC",  {}).get("sign", "")

        # 日本語キー版（表示用）
        elem_count_jp = {L.element(k): v for k, v in elem_count.items()}
        mod_count_jp  = {L.modality(k): v for k, v in mod_count.items()}

        # ステリウム検出（3天体以上が同一サイン or 同一ハウス）
        sign_groups: Dict[str, List[str]] = {}
        house_groups: Dict[int, List[str]] = {}
        for name in counted:
            s = planets[name]["sign"]
            h = planets[name].get("house", 0)
            sign_groups.setdefault(s, []).append(name)
            house_groups.setdefault(h, []).append(name)

        stelliums = []
        for s, names in sign_groups.items():
            if len(names) >= 3:
                stelliums.append({
                    "type": "sign", "label": L.sign(s),
                    "planets": [L.planet(n, short=True) for n in names],
                    "count": len(names),
                })
        for h, names in house_groups.items():
            if len(names) >= 3:
                stelliums.append({
                    "type": "house", "label": f"第{h}室",
                    "planets": [L.planet(n, short=True) for n in names],
                    "count": len(names),
                })

        return {
            "element_count":     elem_count,
            "modality_count":    mod_count,
            "element_count_jp":  elem_count_jp,
            "modality_count_jp": mod_count_jp,
            "sun_sign":   sun_sign,
            "moon_sign":  moon_sign,
            "asc_sign":   asc_sign,
            "sun_sign_jp":  L.sign(sun_sign),
            "moon_sign_jp": L.sign(moon_sign),
            "asc_sign_jp":  L.sign(asc_sign),
            "stelliums":  stelliums,
        }

    # ── 天体の黄経取得（タイミング計算用） ─────────────────────────────────

    def get_longitude(self, jd: float, planet_id: int) -> float:
        """指定JDでの天体黄経のみ返す（高速版）"""
        try:
            result, _ = swe.calc_ut(jd, planet_id, swe.FLG_MOSEPH)
            return result[0] % 360
        except Exception:
            return 0.0
