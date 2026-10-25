from __future__ import annotations

from apps.catalogo.models import Categoria


def resolve_categoria(empresa, *, tipo: str, categoria_id=None, categoria_nombre: str = ""):
    if categoria_id:
        cat = Categoria.objects.filter(pk=categoria_id, empresa=empresa, tipo=tipo).first()
        if not cat:
            raise ValueError("Categoría no encontrada.")
        return cat
    nombre = (categoria_nombre or "").strip()
    if not nombre:
        return None
    cat, _ = Categoria.objects.get_or_create(empresa=empresa, tipo=tipo, nombre=nombre)
    return cat
