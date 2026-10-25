# SoftOne Software

Monorepo de productos SoftOne.

| Carpeta | Producto |
|---------|----------|
| [`public/`](public/) | App principal (app / demo.softone360.com) — `backend`, `frontend`, `deploy` |
| [`crm/`](crm/) | SoftOne CRM (crm.softone360.com) |

## Desarrollo rápido

```bash
# App principal
cd public && cp .env.example .env   # editar
cd deploy && docker compose -f docker-compose.prod.yml ...

# CRM
cd crm && cp .env.example .env
cd deploy/scripts && ./sync-crm.sh softone-prod
```

Documentación detallada de la app principal: [`public/README.md`](public/README.md).

## Renombrar repo en GitHub (`app-django` → `software`)

En el navegador (más rápido): [Settings del repo](https://github.com/largoMiguel/app-django/settings) → **Repository name** → `software` → **Rename**.

Luego en local:

```bash
git remote set-url origin git@github.com:largoMiguel/software.git
```

O con GitHub CLI (después de `gh auth login`):

```bash
bash scripts/github-rename-to-software.sh
```

## SSH (tras renombrar la carpeta a `software`)

Si usas `IdentityFile` en `~/.ssh/config`, actualiza la ruta del deploy key:

`…/software/public/deploy/keys/softone_deploy`
