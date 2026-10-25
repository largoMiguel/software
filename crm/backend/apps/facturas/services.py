from __future__ import annotations

from decimal import Decimal

from django.db import models, transaction
from django.utils import timezone

from apps.common.totals import aggregate_lines, line_totals
from apps.cotizaciones.models import Cotizacion
from apps.empresas.consecutivos import siguiente_numero
from apps.empresas.models import Consecutivo
from apps.facturas.models import Factura, FacturaItem, Pago


def recalcular_factura(factura: Factura) -> None:
    line_data = []
    for item in factura.items.all():
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
        item.save(update_fields=["subtotal_linea", "iva_linea", "total_linea"])
        line_data.append(totals)

    agg = aggregate_lines(line_data)
    factura.subtotal = agg["subtotal"]
    factura.iva_total = agg["iva"]
    factura.total = agg["total"]
    factura.save(update_fields=["subtotal", "iva_total", "total"])
    _actualizar_estado_pago(factura)


def _actualizar_estado_pago(factura: Factura) -> None:
    if factura.estado == Factura.EST_ANULADA:
        return
    pagado = factura.pagos.aggregate(total=models.Sum("monto"))["total"] or Decimal("0")
    factura.total_pagado = pagado
    if pagado <= 0:
        if factura.estado in (Factura.EST_PAGADA, Factura.EST_PAGADA_PARCIAL):
            factura.estado = Factura.EST_EMITIDA
    elif pagado >= factura.total:
        factura.estado = Factura.EST_PAGADA
    else:
        factura.estado = Factura.EST_PAGADA_PARCIAL
    factura.save(update_fields=["total_pagado", "estado"])


def asignar_numero_si_falta(factura: Factura) -> None:
    if factura.numero:
        return
    factura.numero = siguiente_numero(factura.empresa, Consecutivo.TIPO_FACTURA)
    factura.save(update_fields=["numero"])


@transaction.atomic
def factura_desde_cotizacion(cotizacion: Cotizacion) -> Factura:
    if cotizacion.estado != Cotizacion.EST_ACEPTADA:
        raise ValueError("La cotización debe estar aceptada.")
    if cotizacion.facturas.exclude(estado=Factura.EST_ANULADA).exists():
        raise ValueError("Ya existe una factura para esta cotización.")

    factura = Factura.objects.create(
        empresa=cotizacion.empresa,
        cliente=cotizacion.cliente,
        cotizacion=cotizacion,
        fecha_emision=timezone.localdate(),
        fecha_vencimiento=cotizacion.fecha_vencimiento,
        notas=cotizacion.notas,
        estado=Factura.EST_BORRADOR,
    )
    for item in cotizacion.items.all():
        FacturaItem.objects.create(
            factura=factura,
            producto=item.producto,
            descripcion=item.descripcion,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            precio_incluye_iva=item.precio_incluye_iva,
            descuento_porcentaje=item.descuento_porcentaje,
            iva_porcentaje=item.iva_porcentaje,
            orden=item.orden,
        )
    recalcular_factura(factura)
    asignar_numero_si_falta(factura)
    return factura


def registrar_pago(factura: Factura, **pago_data) -> Pago:
    pago = Pago.objects.create(factura=factura, **pago_data)
    _actualizar_estado_pago(factura)
    return pago
