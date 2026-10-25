from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

TWO = Decimal("0.01")


def line_totals(
    cantidad: Decimal,
    precio: Decimal,
    descuento_pct: Decimal,
    iva_pct: Decimal,
    *,
    precio_incluye_iva: bool = False,
):
    """
    precio_incluye_iva=False: precio unitario es base gravable (sin IVA).
    precio_incluye_iva=True: precio unitario ya incluye IVA; se desglosa en subtotal + IVA.
    """
    cantidad = Decimal(cantidad)
    precio = Decimal(precio)
    descuento_pct = Decimal(descuento_pct or 0)
    iva_pct = Decimal(iva_pct or 0)

    bruto = (cantidad * precio).quantize(TWO, rounding=ROUND_HALF_UP)
    descuento = (bruto * descuento_pct / Decimal("100")).quantize(TWO, rounding=ROUND_HALF_UP)
    base = bruto - descuento

    if precio_incluye_iva:
        total = base
        if iva_pct > 0:
            divisor = Decimal("1") + iva_pct / Decimal("100")
            subtotal = (total / divisor).quantize(TWO, rounding=ROUND_HALF_UP)
            iva = (total - subtotal).quantize(TWO, rounding=ROUND_HALF_UP)
        else:
            subtotal = total
            iva = Decimal("0")
    else:
        subtotal = base
        iva = (subtotal * iva_pct / Decimal("100")).quantize(TWO, rounding=ROUND_HALF_UP)
        total = subtotal + iva

    return {
        "subtotal_linea": subtotal,
        "iva_linea": iva,
        "total_linea": total,
    }


def aggregate_lines(lines):
    subtotal = Decimal("0")
    iva = Decimal("0")
    total = Decimal("0")
    for line in lines:
        subtotal += line["subtotal_linea"]
        iva += line["iva_linea"]
        total += line["total_linea"]
    return {
        "subtotal": subtotal.quantize(TWO, rounding=ROUND_HALF_UP),
        "iva": iva.quantize(TWO, rounding=ROUND_HALF_UP),
        "total": total.quantize(TWO, rounding=ROUND_HALF_UP),
    }
