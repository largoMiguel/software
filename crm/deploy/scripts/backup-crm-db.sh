#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
cd "$DEPLOY_DIR"

BACKUP_DIR=/var/backups/softone-crm
if [[ ! -d "$BACKUP_DIR" ]]; then
  sudo mkdir -p "$BACKUP_DIR"
  sudo chown "$(id -u):$(id -g)" "$BACKUP_DIR"
fi

STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/softone_crm_${STAMP}.dump"

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

docker compose -f docker-compose.crm.yml --env-file "$ENV_FILE" exec -T crm-db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c > "$OUT"

find "$BACKUP_DIR" -name 'softone_crm_*.dump' -mtime +14 -delete
echo "Backup: $OUT"

if [[ "$(grep -E '^USE_B2_STORAGE=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')" == "true" ]]; then
  B2_KEY_ID=$(grep -E '^B2_KEY_ID=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  B2_APP_KEY=$(grep -E '^B2_APP_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  B2_BUCKET=$(grep -E '^B2_BUCKET_CRM=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  B2_ENDPOINT=$(grep -E '^B2_ENDPOINT_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true)
  B2_ENDPOINT="${B2_ENDPOINT:-https://s3.us-east-005.backblazeb2.com}"
  B2_REGION=$(grep -E '^B2_REGION=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true)
  B2_REGION="${B2_REGION:-us-east-005}"
  if [[ -n "$B2_KEY_ID" && -n "$B2_APP_KEY" && -n "$B2_BUCKET" ]]; then
    REMOTE_KEY="backups/db/$(basename "$OUT")"
    AWS_ACCESS_KEY_ID="$B2_KEY_ID" AWS_SECRET_ACCESS_KEY="$B2_APP_KEY" \
      aws s3 cp "$OUT" "s3://${B2_BUCKET}/${REMOTE_KEY}" \
        --endpoint-url "$B2_ENDPOINT" --region "$B2_REGION" && echo "B2 upload: s3://${B2_BUCKET}/${REMOTE_KEY}"
  fi
fi
