#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"

case "$TARGET" in
  local|dev)
    "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/set-app-mode.sh" dev
    ;;
  remote|online|prod)
    "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/set-app-mode.sh" online
    ;;
  *)
    echo "set-api-base.sh has been replaced by set-app-mode.sh." >&2
    echo "Usage: $0 local|remote" >&2
    exit 2
    ;;
esac
