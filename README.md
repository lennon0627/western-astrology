# 西洋占星術チャート

Tropical / Placidus 方式の西洋占星術計算エンジン + Web UI。

## 構成

```
western_astrology/
├── api.py          # FastAPI エンドポイント
├── engine/         # 計算コア
│   ├── calculator.py   # ネイタルチャート（pyswisseph）
│   ├── dignity.py      # 品位・ルーラー
│   ├── scoring.py      # 総合スコア
│   ├── transits.py     # トランジットカレンダー
│   ├── progressions.py # 二次進行
│   ├── solar_arc.py    # ソーラーアーク
│   ├── solar_return.py # ソーラーリターン
│   └── synastry.py     # シナストリー
├── frontend/       # Next.js 16 + shadcn/ui
├── notebooks/      # 検証用 Jupyter ノートブック
├── dev.sh          # API + フロントエンド同時起動
└── requirements.txt
```

## セットアップ

```bash
# Python 環境
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# フロントエンド依存関係
cd frontend && npm install
```

## 起動

```bash
./dev.sh
```

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:3000 |
| API ドキュメント | http://localhost:8001/docs |

個別起動:

```bash
# API のみ
.venv/bin/uvicorn api:app --port 8001 --reload

# フロントエンドのみ
cd frontend && npm run dev
```

## API

### POST /reading

ネイタル・トランジット・プログレッション・ソーラーアーク・ソーラーリターンを一括取得。

```bash
curl -X POST http://localhost:8001/reading \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "year": 1940, "month": 10, "day": 9,
      "hour": 18, "minute": 30,
      "city": "Liverpool"
    },
    "current_dt": "2025-01-01T12:00:00",
    "sr_year": 2025
  }'
```

レスポンス:

```json
{
  "chart":        { ... },  // ネイタルチャート + スコア
  "transit":      { "events": [ ... ] },
  "progression":  { ... },
  "solar_arc":    { ... },
  "solar_return": { ... }
}
```

### POST /synastry

2人のインターアスペクト・コンポジットチャート・相性スコアを取得。

```bash
curl -X POST http://localhost:8001/synastry \
  -H "Content-Type: application/json" \
  -d '{
    "person_a": { "year": 1940, "month": 10, "day": 9, "hour": 18, "minute": 30, "city": "Liverpool" },
    "person_b": { "year": 1969, "month": 10, "day": 9, "hour": 2,  "minute": 0,  "city": "Tokyo" }
  }'
```

### 出生地の指定方法

都市名 **または** 緯度・経度・タイムゾーンで指定:

```json
{ "city": "Tokyo" }
// または
{ "lat": 35.6895, "lon": 139.6917, "tz": "Asia/Tokyo" }
```

## フロントエンド タブ構成

| タブ | 内容 |
|-----|------|
| ネイタル | SVGホロスコープホイール・天体配置・総合スコア |
| トランジット | 365日のトランジットイベント一覧 |
| プログレッション | 二次進行天体・ネイタルへのアスペクト |
| ソーラーアーク | SA天体・未来イベント予測 |
| ソーラーリターン | 太陽回帰チャート・ネイタルへのアスペクト |
| シナストリー | 2人の相性スコア・インターアスペクト |

## 技術スタック

**バックエンド**: Python 3.11 / FastAPI / pyswisseph / geopy

**フロントエンド**: Next.js 16 / TypeScript / Tailwind CSS v4 / shadcn/ui / Recharts
