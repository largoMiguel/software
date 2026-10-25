#!/usr/bin/env bash
# Renombra el repo GitHub largoMiguel/app-django → largoMiguel/software
# Requiere: gh auth login (una vez)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instala GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Inicia sesión: gh auth login" >&2
  exit 1
fi

echo "==> Renombrando repositorio en GitHub…"
gh repo rename software -R largoMiguel/app-django --yes

echo "==> Actualizando remote origin…"
git remote set-url origin git@github.com:largoMiguel/software.git
git remote -v

echo "OK. Repo: https://github.com/largoMiguel/software"
