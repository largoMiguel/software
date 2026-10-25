from __future__ import annotations

from apps.common.document_pdf import (
    CommercialDocumentPdf,
    DocumentLineRow,
    DocumentTotals,
    render_commercial_document_pdf,
)
from apps.cotizaciones.models import Cotizacion


def _iva_etiqueta(cotizacion: Cotizacion) -> str:
    item = cotizacion.items.first()
    if item and item.iva_porcentaje:
        pct = item.iva_porcentaje.normalize()
        return f"IVA {pct}%"
    return "IVA"


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
        document_kind="cotizacion",
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
        cliente_nombre=cliente.razon_social,
        cliente_documento=f"{cliente.tipo_documento.upper()} {cliente.documento}",
        cliente_direccion=cliente.direccion or "",
        cliente_email=cliente.email or "",
        cliente_telefono=cliente.telefono or "",
        condiciones=cotizacion.notas or "",
        filas=filas,
        totales=DocumentTotals(
            subtotal=cotizacion.subtotal,
            iva=cotizacion.iva_total,
            total=cotizacion.total,
            iva_etiqueta=_iva_etiqueta(cotizacion),
        ),
    )
    return render_commercial_document_pdf(doc)
