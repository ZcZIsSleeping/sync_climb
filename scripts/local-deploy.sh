#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8787}"
DATABASE_URL="${DATABASE_URL:-postgres://syn_climb:syn_climb@localhost:5432/syn_climb}"

"$ROOT_DIR/scripts/set-app-mode.sh" dev

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  npm install --prefix "$ROOT_DIR"
fi

if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
  npm install --prefix "$ROOT_DIR/server"
fi

DATABASE_URL="$DATABASE_URL" npm run db:migrate --prefix "$ROOT_DIR/server"

echo "Local backend: http://localhost:$PORT"
echo "Press Ctrl+C to stop."
DATABASE_URL="$DATABASE_URL" PORT="$PORT" ENABLE_LOCAL_LOGIN=true npm run dev --prefix "$ROOT_DIR/server"
