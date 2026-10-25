#!/bin/sh
set -e

echo ">> Esperando Postgres en ${POSTGRES_HOST:-crm-db}:${POSTGRES_PORT:-5432}…"
python - <<'PY'
import os, socket, time
host = os.getenv("POSTGRES_HOST", "crm-db")
port = int(os.getenv("POSTGRES_PORT", "5432"))
for i in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            print("   db up")
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit("DB no respondió tras 60s")
PY

mkdir -p /app/staticfiles /app/media
chown -R appuser:appuser /app/staticfiles /app/media

echo ">> Migraciones"
gosu appuser python manage.py migrate --noinput

echo ">> Bootstrap CRM"
gosu appuser python manage.py bootstrap_crm

echo ">> Collectstatic"
gosu appuser python manage.py collectstatic --noinput --clear

echo ">> Arrancando aplicación"
exec gosu appuser "$@"
