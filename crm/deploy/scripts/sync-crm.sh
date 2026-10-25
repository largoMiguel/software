#!/usr/bin/env bash
# Sincroniza crm/ hacia /opt/softone-crm (preserva .env).
set -euo pipefail

REMOTE="${1:-softone-prod}"
REMOTE_PATH="/opt/softone-crm"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRM_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_KEY="$(cd "$SCRIPT_DIR/../../.." && pwd)/public/deploy/keys/softone_deploy"
RSYNC_SSH="ssh -o StrictHostKeyChecking=accept-new"
if [[ -f "$DEPLOY_KEY" ]]; then
  RSYNC_SSH="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=accept-new"
fi

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'backend/.venv' \
  --exclude 'staticfiles' \
  --exclude 'media' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude 'logs' \
  -e "$RSYNC_SSH" \
  "$CRM_ROOT/" "$REMOTE:$REMOTE_PATH/"

echo "OK. Sincronizado a $REMOTE:$REMOTE_PATH"
echo "Ahora: ssh $REMOTE 'cd $REMOTE_PATH && deploy/scripts/deploy-crm.sh'"
