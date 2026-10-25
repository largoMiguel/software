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
