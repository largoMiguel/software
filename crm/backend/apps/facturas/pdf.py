from __future__ import annotations

from apps.common.document_pdf import (
    CommercialDocumentPdf,
    DocumentLineRow,
    DocumentParty,
    DocumentTotals,
    render_commercial_document_pdf,
)
from apps.facturas.models import Factura


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
    notas = factura.notas or ""
    extra = f"Pagado: ${factura.total_pagado:,.2f} · Saldo: ${factura.saldo_pendiente:,.2f}"
    notas = f"{notas}\n\n{extra}".strip() if notas else extra

    doc = CommercialDocumentPdf(
        tipo_titulo="FACTURA",
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
        emisor=DocumentParty(
            titulo="Emisor",
            lineas=[empresa.nombre, empresa.direccion or "N/D", empresa.telefono or "", empresa.email or ""],
        ),
        cliente=DocumentParty(
            titulo="Cliente",
            lineas=[cliente.razon_social, f"{cliente.tipo_documento.upper()} {cliente.documento}"],
        ),
        notas=notas,
        filas=filas,
        totales=DocumentTotals(
            subtotal=factura.subtotal,
            iva=factura.iva_total,
            total=factura.total,
        ),
    )
    return render_commercial_document_pdf(doc)
