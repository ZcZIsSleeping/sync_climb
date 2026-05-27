#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_NAME="${REMOTE_NAME:-origin}"
REMOTE_HOST="${REMOTE_HOST:-www.synclimb.online}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/sync_climb}"
LOCAL_SSH_KEY="${LOCAL_SSH_KEY:-/Users/admin/.ssh/id_rsa}"
REMOTE_DEPLOY_KEY="${REMOTE_DEPLOY_KEY:-/root/.ssh/sync_climb_deploy}"
COMMIT_MESSAGE="${1:-部署当前更改}"

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/set-api-base.sh" remote

npx tsc --noEmit
npm run build --prefix "$ROOT_DIR/server"
npm run test --prefix "$ROOT_DIR/server"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "HEAD" ]; then
  echo "Cannot deploy from detached HEAD." >&2
  exit 1
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MESSAGE"
else
  echo "No local changes to commit."
fi

git push "$REMOTE_NAME" "$BRANCH"

ssh -i "$LOCAL_SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "set -euo pipefail
   cd '$REMOTE_APP_DIR'
   export GIT_SSH_COMMAND='ssh -i $REMOTE_DEPLOY_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
   git fetch '$REMOTE_NAME' '$BRANCH'
   git checkout -B '$BRANCH' '$REMOTE_NAME/$BRANCH'
   npm ci --prefix '$REMOTE_APP_DIR/server'
   npm run build --prefix '$REMOTE_APP_DIR/server'
   set -a
   . /etc/synclimb/backend.env
   set +a
   npm run db:migrate --prefix '$REMOTE_APP_DIR/server'
   systemctl restart synclimb-backend
   systemctl is-active --quiet synclimb-backend"

curl -4 -fsS "https://$REMOTE_HOST/health"
echo
echo "Online deploy complete: branch=$BRANCH api=https://$REMOTE_HOST"
