# SoftOne App (Django + React)

Aplicación full-stack lista para producción.

- **Frontend:** React 19 + Vite 6 + Tailwind CSS v4 + TypeScript 5
- **Backend:** Python 3.13 + Django 5.1 + Django REST Framework 3.15 (sólo API, sin vistas server-rendered de negocio)
- **DB:** PostgreSQL 17
- **Auth:** Clerk en español (login, invitaciones, revocación de sesión en vivo) + Django RBAC (roles, permisos, módulos por entidad)
- **RBAC:** roles sobre `django.contrib.auth.Group` + `Permission` — listo para proteger vistas DRF, URLs y consultas
- **Multi-tenancy:** entidades (municipios/organismos) + secretarías + módulos habilitables por entidad
- **Multi-entidad:** un usuario puede pertenecer a varias entidades (`UserEntityMembership`); la entidad activa se envía con la cabecera `X-Entity-Id` (selector al iniciar sesión si tiene más de una)
- **Jerarquía de delegación:** admin → secretario → contratista (supervisor en membresía, sub-asignación PQRS/PDM, módulos en cascada)
- **Módulo PQRS:** Gestión de Peticiones, Quejas, Reclamos, Sugerencias y Denuncias (Ley 1755 de 2015)
- **Portal ciudadano:** formulario público por entidad (`/portal/:slug`) sin autenticación
- **IA:** OpenAI (`gpt-4o-mini` por defecto) para extracción y clasificación automática de PQRS a partir de texto o documentos adjuntos
- **Reverse proxy:** Nginx (Docker)
- **Acceso público:** Cloudflare Tunnel (HTTP/2) → `https://app.softone360.com`

URL en producción: **https://app.softone360.com**

---

## Estructura

```
software/public/
├── backend/                       # Django + DRF (sólo API)
│   ├── config/
│   │   ├── settings/              # base.py · dev.py · prod.py
│   │   ├── urls.py
│   │   ├── api_v1.py
│   │   ├── wsgi.py · asgi.py
│   ├── apps/
│   │   ├── accounts/              # User custom (email) + auth Clerk + gestión usuarios
│   │   ├── rbac/                  # Roles + permissions (Group + RoleMeta)
│   │   ├── entities/              # Entidades + Secretarías (multi-tenancy)
│   │   ├── pdm/                   # Módulo PDM + chat IA público
│   │   │   ├── chat_tools.py      # Consultas read-only acotadas por entidad
│   │   │   ├── chat_service.py    # Orquestador OpenAI tool-calling
│   │   │   ├── public_chat_views.py · public_chat_urls.py
│   │   │   └── models.py          # Productos, actividades, chat conversations
│   │   ├── pqrs/                  # Módulo PQRS completo
│   │   │   ├── models.py          # PQRS, AsignacionAuditoria, PQRSArchivo
│   │   │   ├── serializers.py
│   │   │   ├── views.py           # ViewSet + acciones: asignar, responder, auto-create (IA)
│   │   │   ├── public_views.py    # API pública del portal ciudadano
│   │   │   ├── public_urls.py
│   │   │   ├── admin.py
│   │   │   ├── services/
│   │   │   │   └── ai.py          # Extracción de texto (PDF/DOCX/TXT) + llamada OpenAI
│   │   │   └── migrations/
│   │   ├── secop/                  # Módulo Contratación SECOP I/II
│   │   ├── planes/                 # Planes Institucionales (Decreto 612)
│   │   ├── gestion_documental/    # Gestión documental SGDEA (Ley 594 / AGN 001-2024)
│   │   ├── pic/                   # PIC — Plan de Intervenciones Colectivas
│   │   └── common/
│   │       └── management/commands/bootstrap_app.py
│   ├── requirements.txt · pyproject.toml
│   ├── Dockerfile · docker-entrypoint.sh
│   └── manage.py
├── frontend/                      # React + Vite + Tailwind v4
│   ├── src/
│   │   ├── core/
│   │   │   ├── api/
│   │   │   │   ├── client.ts      # Axios + token Clerk por petición
│   │   │   │   ├── pqrs.ts        # API PQRS (list, create, autoCreate, archivos…)
│   │   │   │   └── pqrsPublic.ts  # API portal ciudadano
│   │   │   └── auth/              # store · api · RequireAuth · RequireRole · RequireModule (Clerk session)
│   │   ├── features/
│   │   │   ├── auth/LoginPage.tsx
│   │   │   ├── pdmchat/           # PublicPdmChatPage (chat IA PDM público)
│   │   │   ├── pqrs/              # PqrsLayout · Dashboard · List/Detail/Nueva/Edit · Informes · PublicPQRSPortal
│   │   │   ├── users/UsersPage.tsx
│   │   │   └── superadmin/        # EntitiesPage · EntityDetailPage
│   │   └── components/layout/
│   ├── index.html · vite.config.ts · tsconfig.json
│   ├── nginx.conf · Dockerfile
│   └── package.json
├── deploy/
│   ├── docker-compose.prod.yml    # db + backend + frontend + nginx + cloudflared
│   ├── nginx/
│   ├── cloudflared/               # config.yml + config.template.yml
│   └── scripts/
│       ├── server-bootstrap.sh
│       ├── deploy.sh
│       ├── sync.sh
│       └── backup-db.sh
├── docker-compose.dev.yml         # sólo PostgreSQL (dev)
└── .env.example
```

---

## Módulos

| Módulo | Descripción |
|--------|-------------|
| PQRS | Ley 1755 — portal, IMAP, IA |
| PDM | Plan de desarrollo, PIIP, informes |
| SECOP | Contratación I/II |
| Planes | Decreto 612 |
| Gestión documental | Ley 594 / AGN |
| PIC | Intervenciones colectivas |
| Chat IA PDM | Widget público |

Detalle de endpoints, flujos y roles: **[docs/modulos.md](docs/modulos.md)**.

Guía PDF informes: **[docs/informes-estilos.md](docs/informes-estilos.md)**.

Otros: [google-gmail-pqrs.md](docs/google-gmail-pqrs.md) · [module-implementation-guide.md](docs/module-implementation-guide.md) · [production-improvements.md](docs/production-improvements.md) · [AUDITORIA.md](docs/AUDITORIA.md)

---

## Desarrollo local

### Base de datos (Docker)

```bash
# Levantar PostgreSQL local
docker compose -f docker-compose.dev.yml up -d db
```

### Backend

```bash
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env             # edita credenciales + OPENAI_API_KEY
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py bootstrap_app         # crea roles + superadmin inicial
python manage.py runserver 0.0.0.0:8000
```

API en `http://localhost:8000/api/v1/` · Docs Swagger: `/api/docs/`.

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxy /api → :8000)
```

---

## Modelo RBAC

- Usuario (`apps.accounts.User`) → pertenece a uno o varios `Group`.
- Cada `Group` representa un **rol** y tiene su `RoleMeta` (descripción, `is_system`).
- Cada `Group` agrupa N `Permission` de Django (`<app>.<action>_<model>`).
- Roles por defecto creados por `bootstrap_app`:
  - `superadmin` (todos los permisos, no se puede borrar)
  - `admin` (todos los permisos, no se puede borrar)
  - `secretario`, `ciudadano`, `contratista`, `auditor` (sin permisos asignados; añadirlos desde Admin o API)

### Proteger una vista DRF

```python
from apps.rbac.permissions import HasRole, HasPerm, IsAdminRole

class FacturaViewSet(viewsets.ModelViewSet):
    permission_classes = [HasRole("contabilidad", "admin")]

class ReporteViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [HasPerm("reportes.view_reporte")]
```

### Proteger una ruta en React

```tsx
<Route element={<RequireRole roles={["admin"]} />}>
  <Route element={<RequireModule module="enable_pqrs" />}>
    <Route path="/pqrs" element={<PqrsLayout />}>
      <Route index element={<PQRSDashboard />} />
      <Route path="solicitudes" element={<PQRSListPage />} />
    </Route>
  </Route>
</Route>
```

`useAuthStore().user.roles`, `permissions` y `enabled_modules` están disponibles para ocultar botones / menús.

**Secretario:** `enabled_modules` vacío = **ningún** módulo (debe asignarse explícitamente en Usuarios). Admin: lista vacía = todos los módulos activos de la entidad.

### API REST de roles

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/rbac/roles/` | Listar roles |
| `POST` | `/api/v1/rbac/roles/` | Crear rol `{ name, description, permissions: [id…] }` |
| `PATCH` | `/api/v1/rbac/roles/<id>/` | Editar rol |
| `DELETE` | `/api/v1/rbac/roles/<id>/` | Borrar rol (no permitido si `is_system`) |
| `POST` | `/api/v1/rbac/roles/assign/` | Asignar roles a un usuario `{ user_id, role_ids }` |
| `GET` | `/api/v1/rbac/permissions/` | Catálogo de permisos |

Todos requieren rol `admin` o `superadmin`.

---

## Endpoints de autenticación

El login, logout y cambio de contraseña los gestiona **Clerk** (`<SignIn>` en español). La sesión se valida en cada petición API; si la cuenta está inhabilitada o se revoca la sesión en Clerk, la app cierra sesión y muestra un aviso en `/login`. Django expone el perfil local (roles, permisos, módulos):

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/auth/me` | Usuario actual + `memberships[]` y `active_entity_id` (cabecera opcional `X-Entity-Id`) |
| `GET` | `/api/v1/auth/memberships/` | Entidades del usuario con rol por entidad |

El frontend persiste `activeEntityId` y envía `X-Entity-Id` en cada petición API. Si hay varias membresías y ninguna elegida, redirige a `/seleccionar-entidad`.

**Kiosco de asistencia:** el token del equipo ya no rota en cada marcación; se almacena de forma redundante (localStorage + cookie + IndexedDB). La desvinculación solo está disponible en el panel admin (Revocar), no en el kiosco.

Webhook Clerk (público, verificado con firma Svix):

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/v1/webhooks/clerk` | Sincroniza `user.created`, `user.updated`, `user.deleted` con Django |

Los usuarios se crean desde superadmin/admin vía `POST /api/v1/users/` (también aprovisionados en Clerk con password o invitación `{ invite: true }`).

Desactivar o eliminar usuarios:

| Método | Endpoint | Descripción |
|---|---|---|
| `DELETE` | `/api/v1/users/{id}/` | Desactiva en Django y banea en Clerk (reversible) |
| `GET` | `/api/v1/users/lookup-email/?email=` | Comprueba si el email ya existe y en qué entidades |
| `DELETE` | `/api/v1/users/{id}/?purge=true` | Elimina permanentemente en Django y Clerk |

### Configuración requerida en Clerk Dashboard

Para invitaciones, nombres y acceso restringido:

1. **User & authentication → Email address:** habilitar Email con Password (o código de verificación).
2. **Personal information → Name:** habilitar para sincronizar nombres.
3. **Restrictions → Sign-up mode:** `Restricted` (solo usuarios invitados o creados por admin).

---

## Despliegue: producción + demo en paralelo

Repositorio: **git@github.com:largoMiguel/software.git** (app en `public/`)

| Entorno | Rama | URL | Ruta servidor | LAN |
|---|---|---|---|---|
| **Producción** | `main` | https://app.softone360.com | `/opt/softone-app` | `:8080` |
| **Demo** | `development` | https://demo.softone360.com | `/opt/softone-demo` | `:8081` |

Archivos firmados:

| Entorno | Worker | Bucket(s) B2 |
|---|---|---|
| Prod | https://files.softone360.com | `softone-pqrs`, `softone-pdm`, `softone-th`, `softone-correspondence`, `softone-planes-612`, `softone-document-management`, `softone-pic` |
| Demo | https://files-demo.softone360.com | `storage-demo` (todos los módulos) |

Demo y prod comparten el **mismo servidor** (`192.168.88.2`) y el **mismo par B2** (`B2_KEY_ID` / `B2_APP_KEY`); solo cambian bucket y signing key. Merge `development` → `main` no migra archivos entre buckets.

**Importante:** `deploy/cloudflared/config.yml` y el regex de buckets en `deploy/nginx/conf.d/app.conf` los monta el stack de **producción**. Deben ser **idénticos en `main` y `development`**; si un deploy de `main` los sobrescribe sin las entradas demo, `demo.softone360.com` deja de responder.

Clerk demo: usar `pk_test_` / `sk_test_` de la instancia development. `CLERK_JWT_KEY` debe ser el PEM del JWKS de esa instancia (`*.clerk.accounts.dev`), **no** el de producción. Webhook opcional: endpoint `https://demo.softone360.com/api/v1/webhooks/clerk` + `CLERK_WEBHOOK_SIGNING_SECRET` en `/opt/softone-demo/.env`.

### Flujo de despliegue (SSH, sin CI)

GitHub **solo almacena el código**. Cada release se sube al servidor con `rsync` + `deploy.sh` / `deploy-demo.sh`.

```
development (commit + push) → sync-demo + deploy-demo → demo.softone360.com
       ↓ merge a main
main (commit + push) → sync + deploy → app.softone360.com
```

| Entorno | Rama habitual | Sync | Deploy en servidor |
|---|---|---|---|
| **Demo** | `development` | `public/deploy/scripts/sync-demo.sh softone-prod` | `cd /opt/softone-demo && deploy/scripts/deploy-demo.sh` |
| **Producción** | `main` | `public/deploy/scripts/sync.sh softone-prod` | `cd /opt/softone-app && deploy/scripts/deploy.sh` |

En la **LAN MikroTik** (`192.168.88.2`) puedes usar el alias `softone-lan` en lugar de `softone-prod`.

**Checklist merge a producción:** diff en `main`, migraciones Django, buckets B2/worker, y `deploy/cloudflared/config.yml` alineado con demo.

### Bootstrap demo (una vez en el servidor)

```bash
sudo mkdir -p /opt/softone-demo
# Copiar .env.demo.example → /opt/softone-demo/.env
# Completar: SECRET_KEY, POSTGRES_PASSWORD, B2_KEY_ID, B2_APP_KEY (mismos que prod),
# FILE_DELIVERY_SIGNING_KEY (distinto a prod), CLERK_* (instancia development)
cd /opt/softone-demo && bash deploy/scripts/deploy-demo.sh
```

`deploy-demo.sh` verifica el ingress demo en cloudflared prod y solo reinicia el túnel si falta.

### Cloudflare (demo)

DNS + túnel (desde máquina con `CLOUDFLARE_API_TOKEN`):

```bash
export CLOUDFLARE_API_TOKEN=...
bash deploy/scripts/setup-cloudflare-demo-dns.sh
```

Worker demo (`storage-demo`):

```bash
bash deploy/scripts/deploy-cloudflare-worker-demo.sh /opt/softone-demo/.env
```

Tras actualizar `deploy/cloudflared/config.yml` (ingress `demo` / `files-demo` → `softone-demo-nginx`), `deploy-demo.sh` lo sincroniza a prod si hace falta. Manual:

```bash
cd /opt/softone-app/deploy
docker compose -f docker-compose.prod.yml --env-file ../.env restart cloudflared
```

### Desplegar demo (SSH)

```bash
deploy/scripts/sync-demo.sh softone-prod
ssh softone-prod 'cd /opt/softone-demo && deploy/scripts/deploy-demo.sh'
# LAN: http://192.168.88.2:8081
```

---

## Despliegue de cambios (producción)

Servidor prod: `/opt/softone-app`

**Sincronizar ramas tras merge:**

```bash
git push origin development
git checkout main && git pull origin main && git merge development && git push origin main
git checkout development && git merge main && git push origin development
```

### Cloudflare Worker (archivos firmados)

Los anexos PQRS/PDM/Asistencia/Correspondencia se sirven vía `https://files.softone360.com`. Tras cambiar buckets o el worker, redeploy desde tu máquina (requiere Node.js):

```bash
bash deploy/scripts/deploy-cloudflare-worker-from-prod.sh
```

Alternativa con `.env` local completo: `bash deploy/scripts/deploy-cloudflare-worker.sh`

Worker demo: `bash deploy/scripts/deploy-cloudflare-worker-demo.sh /opt/softone-demo/.env`

### Acceso SSH al servidor

| Método | Cuándo usarlo | Comando |
|---|---|---|
| **LAN** | Red MikroTik (`192.168.88.0/24`) | `ssh softone-lan` |
| **Cloudflare** | Desde cualquier red (Access + túnel) | `ssh softone-prod` |

**Servidor de producción:** IP LAN `192.168.88.2` · usuario `softone` · ruta app `/opt/softone-app`

La autenticación SSH usa **clave** (`deploy/keys/softone_deploy`). La contraseña del usuario del sistema no es necesaria para deploy ni administración habitual.

#### Configurar SSH remoto en macOS

1. Instalar `cloudflared` CLI (no basta con la app WARP):

```bash
mkdir -p ~/bin
# Descargar el binario desde https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
# o copiarlo a ~/bin/cloudflared y chmod +x
export PATH="$HOME/bin:$PATH"   # añadir a ~/.zshrc
```

2. Alias en `~/.ssh/config`:

```
Host softone-prod
  HostName ssh.softone360.com
  User softone
  IdentityFile /ruta/a/software/public/deploy/keys/softone_deploy
  StrictHostKeyChecking accept-new
  ProxyCommand ~/bin/cloudflared access ssh --hostname %h
```

3. Verificar:

```bash
ssh softone-prod 'hostname'    # debe responder: softone
```

**Si SSH falla:**

| Síntoma | Causa probable | Solución |
|---|---|---|
| `cloudflared: command not found` | CLI no instalado o no está en PATH | Instalar en `~/bin` y actualizar `ProxyCommand` |
| `Permission denied` con contraseña | El servidor espera clave SSH | Usar `deploy/keys/softone_deploy` o `ssh softone-lan` en LAN |
| `Broken pipe` / timeout remoto | Túnel Cloudflare reconectando | Esperar 1 min o conectar por LAN |
| `REMOTE HOST IDENTIFICATION HAS CHANGED` | Servidor nuevo o reinstalado (clave SSH del host distinta) | `ssh-keygen -R ssh.softone360.com` y `ssh-keygen -R 192.168.88.2`; luego `ssh softone-prod` o `ssh softone-lan` |
| `softone-prod` no resuelve | Falta alias SSH | Crear entrada en `~/.ssh/config` |

### Desplegar producción (SSH)

Nginx publica HTTP en el host en el puerto `LAN_HTTP_PORT` (por defecto **8080**). En el `.env` del servidor, `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` deben incluir la IP LAN (`192.168.88.2`).

```bash
deploy/scripts/sync.sh softone-prod
ssh softone-prod 'cd /opt/softone-app && deploy/scripts/deploy.sh'
# LAN: http://192.168.88.2:8080
```

Equivalente en LAN: `deploy/scripts/sync.sh softone-lan` y el mismo `deploy.sh`.

`deploy.sh` hace `build --pull` y `up -d --remove-orphans`. Es seguro re-ejecutarlo en caliente.

### Casos típicos en el servidor

Alias útil (opcional):

```bash
export COMPOSE="docker compose -f deploy/docker-compose.prod.yml --env-file .env"
```

| Cambio | Comando |
|---|---|
| Deploy completo | `deploy/scripts/deploy.sh` |
| Sólo backend | `$COMPOSE up -d --build backend` |
| Sólo frontend | `$COMPOSE up -d --build frontend` |
| Sólo Nginx | `$COMPOSE restart nginx` |
| Sólo túnel | `$COMPOSE up -d cloudflared` |
| Migración DB | Automática al arrancar backend. Manual: `$COMPOSE exec backend python manage.py migrate` |
| Variable de entorno | Editar `.env` y `$COMPOSE up -d` |

### Logs y troubleshooting

```bash
ssh softone-prod   # o softone-lan en la red MikroTik
cd /opt/softone-app
export COMPOSE="docker compose -f deploy/docker-compose.prod.yml --env-file .env"

$COMPOSE ps
$COMPOSE logs -f --tail=100 backend
$COMPOSE logs -f --tail=100 cloudflared
```

**Si `https://app.softone360.com` no responde:**

1. `$COMPOSE ps` — todos los servicios deben estar `Up` y `healthy`.
2. `$COMPOSE logs cloudflared` — errores de credenciales, DNS o timeouts QUIC al arrancar.
3. `$COMPOSE exec nginx wget -qO- http://127.0.0.1/healthz` — debe devolver `ok`.

**Si la app responde lento por Internet pero rápido en LAN:**

El servidor en LAN suele responder en ~1 ms (`/healthz`). La latencia por Internet (~500–800 ms en el primer byte) proviene del **ruteo de Cloudflare** (tráfico de usuario → edge global → túnel → origen), no del ancho de banda del servidor.

Diagnóstico rápido:

```bash
# En el servidor (debe ser ~1 ms)
curl -s -o /dev/null -w "LAN: %{time_starttransfer}s\n" http://127.0.0.1:8080/healthz

# Desde tu Mac (incluye Cloudflare + túnel)
curl -s -o /dev/null -w "Internet: %{time_starttransfer}s\n" https://app.softone360.com/healthz
```

Si LAN es rápido e Internet lento, el origen está bien. Revisa `$COMPOSE logs cloudflared` por errores `Failed to dial a quic connection` (UDP 7844 bloqueado por el ISP/router). El túnel está configurado con `protocol: http2` para evitar esos timeouts al reiniciar.

Mejoras adicionales posibles (Cloudflare Dashboard): Argo Smart Routing, reglas de caché para `/assets/*`.

### Backups

```bash
ssh softone-prod 'cd /opt/softone-app && deploy/scripts/backup-db.sh'
```

Backups en `/var/backups/softone/softone_YYYYMMDD_HHMMSS.dump`. Retención 14 días. Log del cron: `/opt/softone-app/logs/softone-backup.log`.

Restaurar:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file .env exec -T db \
  pg_restore -U softone -d softone --clean --if-exists \
  < /var/backups/softone/softone_YYYYMMDD_HHMMSS.dump
```

---

## Bootstrap del servidor (Ubuntu Server)

`deploy/scripts/server-bootstrap.sh` deja el servidor recién formateado:

1. Apaga y borra cualquier stack Docker previo (incl. `softone-app` Angular/FastAPI antiguo).
2. Elimina volúmenes, imágenes, redes y servicios systemd legacy.
3. Borra `/opt/softone-app` completo (preserva `~/.cloudflared`).
4. Instala Docker Engine + plugin Compose + UFW + cloudflared CLI.
5. Endurece firewall (sólo SSH entrante).
6. Crea `/opt/softone-app` con permisos correctos.

Uso (desde el servidor):

```bash
scp deploy/scripts/server-bootstrap.sh softone@192.168.88.2:/tmp/
ssh softone@192.168.88.2 'bash /tmp/server-bootstrap.sh'
```

Es **destructivo** y pide confirmación (`SI`) antes de borrar nada.

---

## Seguridad

- TLS termina en Cloudflare; el origen sólo se publica vía túnel (no hay puertos abiertos al Internet).
- UFW activo: sólo SSH (22) entrante.
- Contenedores: `no-new-privileges`, usuario sin privilegios en el backend, redes Docker segmentadas (`internal` para DB/backend, `edge` para nginx ↔ cloudflared/frontend/backend).
- PostgreSQL **no publica puertos** al host.
- Secretos en `.env` (chmod 600), generados con `openssl rand`.
- Clerk verifica tokens de sesión (JWKS / `CLERK_JWT_KEY` opcional); Django mapea `clerk_id` → usuario local con RBAC.
- Redis en producción: caché compartida y rate-limit DRF entre workers Gunicorn.
- Archivos estáticos servidos por Nginx (`/static/`); media protegida sigue en Django con token Clerk.
- Headers de seguridad: CSP (incluye `clerk.softone360.com`, `files.softone360.com`, Cloudflare Insights), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy.
- CORS restringido a orígenes en `CORS_ALLOWED_ORIGINS` (prod: `https://app.softone360.com`, `https://softone360.com`).
- Contraseñas y MFA se gestionan en Clerk; Django usa `set_unusable_password()` para usuarios de app.

### CSP en uso (Nginx)

```
default-src 'self';
img-src 'self' data: blob: https:;
style-src 'self' 'unsafe-inline';
script-src 'self' https://clerk.softone360.com https://challenges.cloudflare.com;
script-src-attr 'unsafe-inline';
font-src 'self' data:;
connect-src 'self' https://clerk.softone360.com https://files.softone360.com;
worker-src 'self' blob:;
frame-src https://challenges.cloudflare.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

---

## Variables de entorno (.env)

Referencia completa en `.env.example`. Resumen de producción:

```
ENV=prod
DEBUG=false
SECRET_KEY=<openssl rand -hex 64>   # obligatoria en prod (sin fallback inseguro)
ALLOW_API_DOCS=false
ENABLE_DJANGO_ADMIN=false

ALLOWED_HOSTS=app.softone360.com,softone360.com,files.softone360.com
CORS_ALLOWED_ORIGINS=https://app.softone360.com,https://softone360.com

POSTGRES_DB=softone
POSTGRES_USER=softone
POSTGRES_PASSWORD=<password fuerte>

INITIAL_ADMIN_EMAIL=admin@softone360.com
INITIAL_ADMIN_PASSWORD=<password fuerte>
INITIAL_ADMIN_NAME=Admin SoftOne

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_AUTHORIZED_PARTIES=https://app.softone360.com
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# OpenAI (PQRS, informes PDF PDM/Planes, chat PDM)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PDM_CHAT_OPENAI_API_KEY=
PQRS_REPORTS_OPENAI_API_KEY=
PLANES_REPORTS_OPENAI_API_KEY=
# PLANES_REPORTS_OPENAI_MODEL=gpt-4o-mini   # opcional; fallback OPENAI_MODEL

# ZeptoMail — correos PQRS (radicación + respuesta)
PQRS_EMAIL_ENABLED=true
ZEPTOMAIL_TOKEN=Zoho-enczapikey ...
ZEPTOMAIL_FROM_EMAIL=noreply@softone360.com
ZEPTOMAIL_WEBHOOK_SECRET=

# PQRS ingreso IMAP (opcional)
PQRS_INBOUND_ENABLED=false

# Backblaze B2 — archivos por módulo
USE_B2_STORAGE=true
B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET_PQRS=softone-pqrs
B2_BUCKET_PDM=softone-pdm
B2_BUCKET_ASISTENCIA=softone-th
# Reconocimiento facial asistencia (distancia L2 face-api.js; default 0.6)
# ASISTENCIA_FACE_MATCH_THRESHOLD=0.6
B2_BUCKET_CORRESPONDENCIA=softone-correspondence
B2_BUCKET_PLANES=softone-planes-612
B2_BUCKET_GESTION_DOCUMENTAL=softone-document-management
B2_BUCKET_PIC=softone-pic
B2_BUCKET_DB=softone-db

# Entrega firmada vía Cloudflare Worker
FILE_DELIVERY_BASE_URL=https://files.softone360.com
FILE_DELIVERY_SIGNING_KEY=<openssl rand -hex 32>
FILE_DELIVERY_TTL=600

# Cloudflare API (solo deploy del Worker files)
# CLOUDFLARE_API_TOKEN=

# Redis / Celery (inyectado por docker-compose en prod)
# REDIS_URL=redis://redis:6379/0

# Gunicorn (opcional)
# GUNICORN_WORKERS=5
# GUNICORN_THREADS=4
```

`INITIAL_ADMIN_*` sólo crean el superadmin si no existe un usuario con ese email. Migraciones y `bootstrap_app` se ejecutan en el contenedor **backend** (Celery omite migraciones).

**Base de datos:** producción usa PostgreSQL con extensión **pgvector** (`pgvector/pgvector:pg17`) para embeddings (módulo IA) y plantillas faciales de asistencia (HNSW + distancia L2).

---

## Túnel Cloudflare

Túnel existente:

- Nombre: `softone-app`
- UUID: `1b010f95-dd5a-4236-bd6d-a71c6ef79d15`
- DNS app: `app.softone360.com` (CNAME al túnel)
- DNS SSH: `ssh.softone360.com` (CNAME al túnel; acceso protegido con Cloudflare Access)

En este stack el túnel corre como contenedor Docker en modo **config file + credentials JSON** (no token):

- Config: `deploy/cloudflared/config.yml` (montado en el contenedor).
- Credenciales: `~/.cloudflared/1b010f95-dd5a-4236-bd6d-a71c6ef79d15.json` en el host, montadas en `/etc/cloudflared/creds/`.
- Override del directorio: `CLOUDFLARED_CREDS_DIR` en `.env`.

El ingress HTTP apunta a `http://nginx:80`; el ingress SSH apunta a `ssh://host.docker.internal:22` (SSH del host Ubuntu vía `extra_hosts` en Docker Compose).

**Tuning de rendimiento** (`deploy/cloudflared/config.yml`):

- `protocol: http2` — conexión estable al edge (evita timeouts QUIC si UDP:7844 está bloqueado).
- `ha-connections: 4` — múltiples conexiones persistentes al edge de Cloudflare.
- `originRequest.keepAliveConnections: 100` — reutiliza conexiones hacia Nginx.

Tras cambiar la config del túnel: `$COMPOSE restart cloudflared`.

**Nginx** (`deploy/nginx/conf.d/app.conf`): assets con hash en `/assets/*` llevan `Cache-Control: public, immutable` (1 año) para reducir recargas en visitas repetidas.

Comandos útiles:

```bash
ssh softone@192.168.88.2 'cloudflared tunnel info softone-app'
ssh softone@192.168.88.2 'cloudflared tunnel list'

# Métricas del túnel (desde dentro del contenedor)
docker compose -f deploy/docker-compose.prod.yml --env-file .env \
  exec cloudflared wget -qO- http://localhost:2000/metrics
```
