# SoftOne Software

Monorepo en [github.com/largoMiguel/software](https://github.com/largoMiguel/software).

| Carpeta | Producto |
|---------|----------|
| [`public/`](public/) | App principal — https://app.softone360.com / https://demo.softone360.com |
| [`crm/`](crm/) | SoftOne CRM — https://crm.softone360.com |

## Comandos habituales

```bash
# Sync demo (rama development)
cd public && deploy/scripts/sync-demo.sh softone-prod

# Sync CRM
cd crm && deploy/scripts/sync-crm.sh softone-prod
```

Documentación de la app principal: [`public/README.md`](public/README.md).  
CRM: [`crm/README.md`](crm/README.md).
