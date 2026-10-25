from __future__ import annotations

from apps.common.document_pdf import (
    CommercialDocumentPdf,
    DocumentLineRow,
    DocumentParty,
    DocumentTotals,
    render_commercial_document_pdf,
)
from apps.cotizaciones.models import Cotizacion


def cotizacion_pdf_bytes(cotizacion: Cotizacion) -> bytes:
    empresa = cotizacion.empresa
    cliente = cotizacion.cliente
    filas = [
        DocumentLineRow(
            descripcion=item.descripcion,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            descuento_porcentaje=item.descuento_porcentaje,
            iva_porcentaje=item.iva_porcentaje,
            subtotal_linea=item.subtotal_linea,
            iva_linea=item.iva_linea,
            total_linea=item.total_linea,
        )
        for item in cotizacion.items.all()
    ]
    doc = CommercialDocumentPdf(
        tipo_titulo="COTIZACION",
        numero=cotizacion.numero,
        fecha_emision=str(cotizacion.fecha_emision),
        fecha_vencimiento=str(cotizacion.fecha_vencimiento) if cotizacion.fecha_vencimiento else None,
        estado=cotizacion.get_estado_display(),
        empresa_nombre=empresa.nombre,
        empresa_nit=empresa.nit or "",
        empresa_direccion=empresa.direccion or "",
        empresa_telefono=empresa.telefono or "",
        empresa_email=empresa.email or "",
        logo_url=empresa.logo_url or "",
        emisor=DocumentParty(
            titulo="Emisor",
            lineas=[
                empresa.nombre,
                empresa.direccion or "N/D",
                empresa.telefono or "",
                empresa.email or "",
            ],
        ),
        cliente=DocumentParty(
            titulo="Cliente",
            lineas=[
                cliente.razon_social,
                f"{cliente.tipo_documento.upper()} {cliente.documento}",
            ],
        ),
        notas=cotizacion.notas or "",
        filas=filas,
        totales=DocumentTotals(
            subtotal=cotizacion.subtotal,
            iva=cotizacion.iva_total,
            total=cotizacion.total,
        ),
    )
    return render_commercial_document_pdf(doc)
