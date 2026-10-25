from __future__ import annotations

from apps.common.document_pdf import (
    CommercialDocumentPdf,
    DocumentLineRow,
    DocumentTotals,
    render_commercial_document_pdf,
)
from apps.facturas.models import Factura


def _iva_etiqueta(factura: Factura) -> str:
    item = factura.items.first()
    if item and item.iva_porcentaje:
        pct = item.iva_porcentaje.normalize()
        return f"IVA {pct}%"
    return "IVA"


def factura_pdf_bytes(factura: Factura) -> bytes:
    empresa = factura.empresa
    cliente = factura.cliente
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
        for item in factura.items.all()
    ]
    doc = CommercialDocumentPdf(
        document_kind="factura",
        numero=factura.numero,
        fecha_emision=str(factura.fecha_emision),
        fecha_vencimiento=str(factura.fecha_vencimiento) if factura.fecha_vencimiento else None,
        estado=factura.get_estado_display(),
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
        condiciones=factura.notas or "",
        filas=filas,
        totales=DocumentTotals(
            subtotal=factura.subtotal,
            iva=factura.iva_total,
            total=factura.total,
            iva_etiqueta=_iva_etiqueta(factura),
        ),
        extra_totales=[
            ("Pagado", f"${factura.total_pagado:,.2f}"),
            ("Saldo pendiente", f"${factura.saldo_pendiente:,.2f}"),
        ],
    )
    return render_commercial_document_pdf(doc)
