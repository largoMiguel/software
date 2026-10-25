from __future__ import annotations

from apps.common.totals import aggregate_lines, line_totals
from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.empresas.consecutivos import siguiente_numero
from apps.empresas.models import Consecutivo


def recalcular_cotizacion(cotizacion: Cotizacion) -> None:
    line_data = []
    for item in cotizacion.items.all():
        totals = line_totals(
            item.cantidad,
            item.precio_unitario,
            item.descuento_porcentaje,
            item.iva_porcentaje,
            precio_incluye_iva=item.precio_incluye_iva,
        )
        item.subtotal_linea = totals["subtotal_linea"]
        item.iva_linea = totals["iva_linea"]
        item.total_linea = totals["total_linea"]
        item.save(
            update_fields=["subtotal_linea", "iva_linea", "total_linea"],
        )
        line_data.append(totals)

    agg = aggregate_lines(line_data)
    cotizacion.subtotal = agg["subtotal"]
    cotizacion.iva_total = agg["iva"]
    cotizacion.total = agg["total"]
    cotizacion.save(update_fields=["subtotal", "iva_total", "total"])


def asignar_numero_si_falta(cotizacion: Cotizacion) -> None:
    if cotizacion.numero:
        return
    cotizacion.numero = siguiente_numero(cotizacion.empresa, Consecutivo.TIPO_COTIZACION)
    cotizacion.save(update_fields=["numero"])
