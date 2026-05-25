#!/bin/bash
# 西洋占星術 開発サーバー同時起動
# Usage: ./dev.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo "\n停止中..."
  kill $API_PID $FRONT_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# 既存プロセスをポート単位で終了
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# FastAPI (port 8001)
echo "[API] 起動中... http://localhost:8001"
"$ROOT/.venv/bin/uvicorn" api:app --port 8001 --reload &
API_PID=$!

# Next.js (port 3000)
if [ -d "$ROOT/frontend" ]; then
  echo "[FE]  起動中... http://localhost:3000"
  cd "$ROOT/frontend" && npm run dev &
  FRONT_PID=$!
else
  echo "[FE]  frontend/ ディレクトリが見つかりません（スキップ）"
  FRONT_PID=""
fi

echo ""
echo "  API:      http://localhost:8001/docs"
echo "  Frontend: http://localhost:3000"
echo "  停止:     Ctrl+C"
echo ""

wait
