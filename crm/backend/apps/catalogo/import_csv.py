from __future__ import annotations

import csv
import io
from decimal import Decimal, InvalidOperation

from apps.catalogo.categorias import resolve_categoria
from apps.catalogo.models import Categoria, Producto


def _norm_header(h: str) -> str:
    return h.strip().lower().replace(" ", "_")


def _parse_decimal(raw: str, default: Decimal) -> Decimal:
    s = (raw or "").strip().replace(",", ".")
    if not s:
        return default
    return Decimal(s)


def import_productos_csv(empresa, file_obj, *, update_existing: bool = True) -> dict:
    """
    CSV columns (header row required):
    nombre, codigo, precio, tipo, iva_porcentaje, descripcion, categoria
    """
    try:
        text = file_obj.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        file_obj.seek(0)
        text = file_obj.read().decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or "nombre" not in {_norm_header(f) for f in reader.fieldnames}:
        return {
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [{"row": 0, "message": "Falta columna 'nombre' en la cabecera."}],
        }

    field_map = {_norm_header(f): f for f in reader.fieldnames}

    def cell(row: dict, key: str) -> str:
        col = field_map.get(key)
        if not col:
            return ""
        return (row.get(col) or "").strip()

    created = 0
    updated = 0
    skipped = 0
    errors: list[dict] = []

    for idx, row in enumerate(reader, start=2):
        if idx > 5002:
            errors.append({"row": idx, "message": "Límite de 5000 filas por archivo."})
            break

        nombre = cell(row, "nombre")
        if not nombre:
            skipped += 1
            continue

        codigo = cell(row, "codigo")
        tipo_raw = cell(row, "tipo").lower()
        tipo = Producto.TIPO_PRODUCTO if tipo_raw.startswith("prod") else Producto.TIPO_SERVICIO

        try:
            precio = _parse_decimal(cell(row, "precio"), Decimal("0"))
            iva = _parse_decimal(cell(row, "iva_porcentaje"), Decimal("19"))
        except InvalidOperation:
            errors.append({"row": idx, "message": f"Precio o IVA inválido en '{nombre}'."})
            continue

        descripcion = cell(row, "descripcion")
        cat_nombre = cell(row, "categoria")
        categoria = None
        if cat_nombre:
            categoria = resolve_categoria(
                empresa, tipo=Categoria.TIPO_PRODUCTO, categoria_nombre=cat_nombre
            )

        existing = None
        if codigo:
            existing = Producto.objects.filter(empresa=empresa, codigo=codigo).first()
        if not existing:
            existing = Producto.objects.filter(empresa=empresa, nombre=nombre, codigo="").first()

        if existing:
            if not update_existing:
                skipped += 1
                continue
            existing.nombre = nombre
            if codigo:
                existing.codigo = codigo
            existing.precio = precio
            existing.tipo = tipo
            existing.iva_porcentaje = iva
            existing.descripcion = descripcion
            if categoria:
                existing.categoria = categoria
            existing.is_active = True
            existing.save()
            updated += 1
        else:
            Producto.objects.create(
                empresa=empresa,
                nombre=nombre,
                codigo=codigo,
                precio=precio,
                tipo=tipo,
                iva_porcentaje=iva,
                descripcion=descripcion,
                categoria=categoria,
            )
            created += 1

    return {"created": created, "updated": updated, "skipped": skipped, "errors": errors}
