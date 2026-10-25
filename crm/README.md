# SoftOne CRM (`crm.softone360.com`)

Producto **independiente** de `app.softone360.com`: cotizaciones y facturas internas (PDF), multiempresa, Clerk propio.

## Aislamiento

- Código en `crm/` (no modifica `backend/` ni `frontend/` de la app municipal).
- Stack Docker propio en `/opt/softone-crm`.
- PostgreSQL dedicado (`softone-crm-db`, datos en `/srv/postgres/crm`).
- Bucket B2 `softone-crm` (opcional en v1).

## Desarrollo local

```bash
# Postgres (ejemplo con Docker)
docker run --rm -d --name crm-pg -e POSTGRES_USER=softone_crm -e POSTGRES_PASSWORD=softone_crm -e POSTGRES_DB=softone_crm -p 5433:5432 postgres:17-alpine

cd crm/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # ajustar POSTGRES_HOST=localhost POSTGRES_PORT=5433
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py bootstrap_crm
python manage.py runserver 0.0.0.0:8001

cd ../frontend
npm install
npm run dev   # http://localhost:5174
```

## Multiempresa

- Cabecera `X-Empresa-Id` en cada petición API (el frontend la envía automáticamente).
- Superadmin SoftOne (`is_platform_admin`): CRUD en `/api/v1/platform/empresas/`.
- Admin de empresa: configuración en `/api/v1/empresa/config/`, miembros en `/api/v1/membresias/`.

## Despliegue en servidor

1. Copiar `crm/.env.example` → `/opt/softone-crm/.env` y completar secretos (Clerk **app nueva**, Postgres, `SECRET_KEY`).
2. Desde tu máquina: `bash crm/deploy/scripts/sync-crm.sh softone-prod`
3. En servidor: `cd /opt/softone-crm && deploy/scripts/deploy-crm.sh`
4. DNS: `bash crm/deploy/scripts/setup-crm-dns.sh` (con `CLOUDFLARE_API_TOKEN`).
5. Ingress túnel (en repo principal): `crm.softone360.com` → `http://softone-crm-nginx:80`, luego `restart cloudflared` en prod.

## Clerk (manual)

1. Crear aplicación **SoftOne CRM** en Clerk (registro Restricted).
2. Dominio custom `crm.softone360.com` (CNAME `clerk.crm` según Clerk Dashboard).
3. Webhook opcional: `POST https://crm.softone360.com/api/v1/webhooks/clerk`

## Backup

```bash
cd /opt/softone-crm && deploy/scripts/backup-crm-db.sh
```

Cron sugerido (servidor): `0 4 * * * /opt/softone-crm/deploy/scripts/backup-crm-db.sh >> /opt/softone-crm/logs/backup.log 2>&1`
