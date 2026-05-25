# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Tropical / Placidus 西洋占星術プラットフォーム。2層構成：

| 層 | 場所 | 技術 |
|---|---|---|
| 計算エンジン + API | `engine/` + `api.py` | Python 3.11 + pyswisseph + FastAPI |
| フロントエンド | `frontend/` | Next.js 16 + Tailwind v4 + shadcn/ui |

## 起動

```bash
# 両サービス同時起動（推奨）
./dev.sh

# 個別起動
.venv/bin/uvicorn api:app --port 8001 --reload   # API: http://localhost:8001
cd frontend && npm run dev                         # FE:  http://localhost:3000
```

Python 仮想環境: `.venv/`（Python 3.11 必須、pyswisseph はC拡張のため）

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/chart` | POST | ネイタルチャート |
| `/synastry` | POST | シナストリー（相性） |
| `/transit` | POST | トランジットカレンダー |
| `/progression` | POST | セカンダリープログレッション |
| `/solar-arc` | POST | ソーラーアーク |
| `/solar-return` | POST | ソーラーリターン |

リクエスト共通フィールド: `year/month/day/hour/minute` + `city`（都市名）または `lat/lon/tz`。
インタラクティブドキュメント: http://localhost:8001/docs

## エンジンアーキテクチャ

```
engine/
  calculator.py    ← WesternAstrologyEngine（コアクラス）。全モジュールの基盤。
  dignity.py       ← エッセンシャルディグニティ（domicile/exaltation/detriment/fall）
  scoring.py       ← ネイタルスコア 0-100（dignity 40% + house 25% + aspect 35%）
  transits.py      ← トランジット：bisection法でアスペクトexact時刻を秒単位計算
  progressions.py  ← セカンダリープログレッション（一日一年法）
  solar_arc.py     ← ソーラーアーク（SA天体 = ネイタル + プログレス太陽の移動量）
  solar_return.py  ← ソーラーリターン（太陽が出生黄経に戻る瞬間を二分探索）
  synastry.py      ← シナストリー + コンポジットチャート（中点法）
  labels.py        ← 日本語ラベル辞書（天体・アスペクト・サイン・特殊イベント）
```

**WesternAstrologyEngine の主要メソッド:**
- `calc_natal(birth_dt, lat, lon, tz, house_system)` → 全天体・ハウス・アスペクト辞書
- `geocode_city(city)` → `(lat, lon, tz)` （Nominatim + TimezoneFinder）
- `get_longitude(jd, planet_id)` → 黄経（float）
- `check_aspect(long1, long2)` → `(aspect_name, orb)` or `None`

**スキップ対象天体（計算除外）:**
`SNode`（サウスノード）と `Fortune`（フォルチュナ）は transit/solar_arc/scoring 計算から除外。`_NATAL_SKIP` / `_SKIP` 定数で管理。

## フロントエンドアーキテクチャ

```
frontend/src/
  app/page.tsx          ← シングルページ（useState でチャートデータ管理、3タブ構成）
  lib/
    api.ts              ← fetch ラッパー（fetchChart / fetchTransit / fetchSynastry）
    types.ts            ← TypeScript型定義（API レスポンスと1対1対応）
    astro.ts            ← SVG座標計算（lonToXY）+ 天体記号・色・サイン定数
  components/
    ChartWheel.tsx      ← SVGホロスコープホイール（Pure SVG、ライブラリ不使用）
    BirthForm.tsx       ← 生年月日入力フォーム
    PlanetTable.tsx     ← 天体位置テーブル
    ScoreCard.tsx       ← スコア表示（コンポーネントバー付き）
    TransitCalendar.tsx ← トランジットイベント一覧（フィルター付き）
    SynastryView.tsx    ← シナストリー結果表示
```

**ChartWheel SVG 座標系:**
ASC を 9時位置（左）に固定。黄道帯は反時計回り（黄経増加 = 反時計）。

```typescript
// engine/astro.ts の核心ロジック
function lonToXY(lon, ascLon, r, cx, cy) {
  const offset = ((lon - ascLon) % 360 + 360) % 360
  const rad = ((180 - offset) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
```

半径定数（viewBox 500×500, cx=cy=250）: 黄道帯外縁230 → 内縁190 → ハウス内縁130 → 天体165 → アスペクト線90

**Tailwind v4 注意点:**
`globals.css` は `@import "tailwindcss"` 形式（v3 の `@tailwind base` ではない）。ダークモードは `html` 要素の `dark` クラスで強制適用（`layout.tsx`）。

## フロントエンド コーディング規約（frontend/ 厳守）

### UIコンポーネント
- **shadcn/ui** を基盤コンポーネントとして使用
- グラフ・チャート: **Recharts**（BarChart / RadarChart / PieChart 等）
- アニメーション: **Magic UI**（`blur-fade.tsx` / `number-ticker.tsx`）のみ

### スタイリング
- **Tailwindクラスのみ使用**。`style={{}}` インラインスタイルは禁止
  - 例外: `width: \`${pct}%\`` のような動的な数値のみ許可
- **色は CSS 変数で統一**。ハードコードした hex（`#22c55e` 等）は禁止
  - 使用可能: `bg-primary` / `text-muted-foreground` / `bg-card` / `border-border` / `bg-destructive` 等
  - Tailwind のセマンティックカラー（`bg-green-500` 等）は状態表現（成功・警告・エラー）に限り許可
- **デザイン微調整は `globals.css` のみ**で行う。コンポーネント内で細かく調整しない
  - ただし ChartWheel.tsx の SVG 属性（fill / stroke）は天体・サインの色として `astro.ts` の定数経由で許可

### その他
- `cn()` を使う場合は `@/lib/utils` からインポートを確認する

## 検証用ノートブック

```bash
cd frontend  # または western_astrology/
jupyter lab notebooks/01_natal_schema.ipynb
```

John Lennon（1940-10-09 18:30 Liverpool）を基準ケースとして使用。
期待値: 太陽 天秤座16°、月 水瓶座3°、ASC 牡羊座19°。
