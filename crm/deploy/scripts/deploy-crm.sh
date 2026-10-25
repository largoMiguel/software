#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="docker-compose.crm.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: falta .env en $ROOT_DIR" >&2
  exit 1
fi
chmod 600 "$ENV_FILE"

cd "$DEPLOY_DIR"

if ! docker network inspect softone_edge >/dev/null 2>&1; then
  echo "ERROR: falta la red softone_edge (levanta primero el stack prod)." >&2
  exit 1
fi

echo "==> Build CRM…"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --pull

echo "==> Up CRM…"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "==> Esperando backend…"
healthy=0
for _ in $(seq 1 24); do
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T crm-backend \
    curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 5
done
if [[ "$healthy" -ne 1 ]]; then
  echo "ERROR: backend CRM no healthy" >&2
  docker logs --tail 100 softone-crm-backend >&2 || true
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T crm-nginx wget -qO- http://127.0.0.1/healthz | grep -q ok

warn_tunnel_ingress() {
  local prod_cfg="/opt/softone-app/deploy/cloudflared/config.yml"
  if [[ -f "$prod_cfg" ]] && ! grep -q "crm.softone360.com" "$prod_cfg"; then
    echo "AVISO: falta ingress crm.softone360.com en $prod_cfg"
    echo "      Añade la regla y reinicia cloudflared en prod en ventana tranquila."
  fi
}

warn_tunnel_ingress

echo
echo "OK. CRM LAN: http://192.168.88.2:\${LAN_HTTP_PORT:-8082}"
echo "    Pública: https://crm.softone360.com (tras DNS + ingress)"
