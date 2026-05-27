#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"
INDEX_TS="$ROOT_DIR/miniprogram/pages/index/index.ts"

LOCAL_API="${LOCAL_API:-http://localhost:8787}"
REMOTE_API="${REMOTE_API:-https://www.synclimb.online}"

case "$TARGET" in
  local)
    API_BASE="$LOCAL_API"
    ;;
  remote|online)
    API_BASE="$REMOTE_API"
    ;;
  http://*|https://*)
    API_BASE="$TARGET"
    ;;
  *)
    echo "Usage: $0 local|remote|https://example.com" >&2
    exit 2
    ;;
esac

node - "$INDEX_TS" "$API_BASE" <<'NODE'
const fs = require('fs')
const [file, apiBase] = process.argv.slice(2)
const source = fs.readFileSync(file, 'utf8')
const next = source.replace(/const API_BASE = ['"][^'"]+['"]/, `const API_BASE = '${apiBase}'`)

if (source === next) {
  if (!source.includes(`const API_BASE = '${apiBase}'`)) {
    console.error('Failed to find API_BASE declaration')
    process.exit(1)
  }
} else {
  fs.writeFileSync(file, next)
}
NODE

echo "API_BASE=$API_BASE"
