#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"
ENV_TS="$ROOT_DIR/miniprogram/config/env.ts"

case "$TARGET" in
  dev|local)
    APP_MODE="dev"
    ;;
  online|prod|remote)
    APP_MODE="online"
    ;;
  *)
    echo "Usage: $0 dev|online" >&2
    exit 2
    ;;
esac

node - "$ENV_TS" "$APP_MODE" <<'NODE'
const fs = require('fs')
const [file, appMode] = process.argv.slice(2)
const source = fs.readFileSync(file, 'utf8')
const next = source.replace(/export const APP_MODE: AppMode = ['"][^'"]+['"]/, `export const APP_MODE: AppMode = '${appMode}'`)

if (source === next && !source.includes(`export const APP_MODE: AppMode = '${appMode}'`)) {
  console.error('Failed to find APP_MODE declaration')
  process.exit(1)
}

fs.writeFileSync(file, next)
NODE

case "$APP_MODE" in
  dev)
    echo "APP_MODE=dev LOGIN_MODE=local API_BASE=${LOCAL_API:-http://localhost:8787}"
    ;;
  online)
    echo "APP_MODE=online LOGIN_MODE=wechat API_BASE=${REMOTE_API:-https://www.synclimb.online}"
    ;;
esac
