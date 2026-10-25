#!/usr/bin/env bash
# Instala cron diario de backup CRM en el servidor (ejecutar una vez en softone-prod).
set -euo pipefail

ROOT="/opt/softone-crm"
CRON_LINE="0 4 * * * ${ROOT}/deploy/scripts/backup-crm-db.sh >> ${ROOT}/logs/backup.log 2>&1"

mkdir -p "${ROOT}/logs"
( crontab -l 2>/dev/null | grep -Fv "backup-crm-db.sh" || true
  echo "$CRON_LINE"
) | crontab -

echo "OK. Cron CRM backup:"
crontab -l | grep backup-crm-db.sh
