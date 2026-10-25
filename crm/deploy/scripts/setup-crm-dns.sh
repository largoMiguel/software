#!/usr/bin/env bash
set -euo pipefail

ZONE_NAME="${CF_ZONE_NAME:-softone360.com}"
TUNNEL_ID="${CF_TUNNEL_ID:-1b010f95-dd5a-4236-bd6d-a71c6ef79d15}"
TUNNEL_CNAME="${TUNNEL_ID}.cfargotunnel.com"

: "${CLOUDFLARE_API_TOKEN:?Export CLOUDFLARE_API_TOKEN}"

api() {
  curl -fsS -X "$1" "https://api.cloudflare.com/client/v4$2" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "${@:3}"
}

ZONE_ID="$(api GET "/zones?name=${ZONE_NAME}" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])")"

upsert_cname() {
  local name="$1"
  existing="$(api GET "/zones/${ZONE_ID}/dns_records?type=CNAME&name=${name}.${ZONE_NAME}" | python3 -c "
import sys, json
r = json.load(sys.stdin)['result']
print(r[0]['id'] if r else '')
")"
  payload="$(python3 - <<PY
import json
print(json.dumps({"type":"CNAME","name":"${name}","content":"${TUNNEL_CNAME}","proxied":True,"ttl":1}))
PY
)"
  if [[ -n "$existing" ]]; then
    api PUT "/zones/${ZONE_ID}/dns_records/${existing}" -d "$payload" >/dev/null
  else
    api POST "/zones/${ZONE_ID}/dns_records" -d "$payload" >/dev/null
  fi
  echo "DNS ${name}.${ZONE_NAME} OK"
}

upsert_cname crm

echo "Recuerda ingress en deploy/cloudflared/config.yml → softone-crm-nginx:80"
