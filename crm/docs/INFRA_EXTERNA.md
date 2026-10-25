# Infraestructura externa (una vez)

Checklist para poner en marcha `https://crm.softone360.com` sin tocar el stack de `app.softone360.com`.

## 1. Clerk — app nueva

- Crear aplicación **SoftOne CRM** (no reutilizar la de `app.softone360.com`).
- Sign-up mode: **Restricted**.
- Dominio: `crm.softone360.com` (Clerk mostrará CNAME `clerk.crm` u similar en Cloudflare).
- Copiar `pk_live_` / `sk_live_` a `/opt/softone-crm/.env`.
- `CLERK_AUTHORIZED_PARTIES=https://crm.softone360.com`
- Webhook (recomendado en prod): `https://crm.softone360.com/api/v1/webhooks/clerk` + `CLERK_WEBHOOK_SIGNING_SECRET`.
  - Eventos útiles: `user.created`, `user.updated`, `user.deleted` (sync de usuarios locales).
- Tras rotar `CLERK_SECRET_KEY` / JWT en prod, actualizar `/opt/softone-crm/.env` y reiniciar `crm-backend`.

## 2. DNS

```bash
export CLOUDFLARE_API_TOKEN=...
bash /opt/softone-crm/deploy/scripts/setup-crm-dns.sh
```

## 3. Backblaze B2

- Crear bucket `softone-crm` (mismas credenciales `B2_KEY_ID` / `B2_APP_KEY` que prod).
- En `.env`: `B2_BUCKET_CRM=softone-crm`, `USE_B2_STORAGE=true`.

## 4. Servidor

```bash
sudo mkdir -p /opt/softone-crm /srv/postgres/crm
sudo chown softone:softone /opt/softone-crm /srv/postgres/crm
cp crm/.env.example /opt/softone-crm/.env
# editar secretos
bash crm/deploy/scripts/sync-crm.sh softone-prod
ssh softone-prod 'cd /opt/softone-crm && deploy/scripts/deploy-crm.sh'
```

## 5. Túnel Cloudflare

El repo incluye en `deploy/cloudflared/config.yml`:

```yaml
- hostname: crm.softone360.com
  service: http://softone-crm-nginx:80
```

En prod (ventana tranquila):

```bash
cd /opt/softone-app/deploy
docker compose -f docker-compose.prod.yml --env-file ../.env restart cloudflared
```

Verificar: `app`, `demo` y `crm` responden.

## 6. Backup cron

```bash
(crontab -l 2>/dev/null; echo "0 4 * * * /opt/softone-crm/deploy/scripts/backup-crm-db.sh >> /opt/softone-crm/logs/backup.log 2>&1") | crontab -
```

Con `USE_B2_STORAGE=true` y credenciales B2, el mismo script sube el dump a `s3://$B2_BUCKET_CRM/backups/db/` (requiere AWS CLI en el servidor).
