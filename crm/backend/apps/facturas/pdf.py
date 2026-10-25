from __future__ import annotations

from apps.common.pdf import render_simple_pdf
from apps.facturas.models import Factura


def factura_pdf_bytes(factura: Factura) -> bytes:
    empresa = factura.empresa
    cliente = factura.cliente
    item_rows = []
    for item in factura.items.all():
        item_rows.append(
            (
                f"{item.descripcion} x{item.cantidad}",
                f"${item.total_linea:,.2f}",
            )
        )

    sections = [
        (
            "Empresa",
            [
                ("Nombre", empresa.nombre),
                ("NIT", empresa.nit or "—"),
                ("Dirección", empresa.direccion or "—"),
                ("Teléfono", empresa.telefono or "—"),
                ("Email", empresa.email or "—"),
            ],
        ),
        (
            "Cliente",
            [
                ("Razón social", cliente.razon_social),
                ("Documento", f"{cliente.tipo_documento.upper()} {cliente.documento}"),
            ],
        ),
        (
            "Factura",
            [
                ("Número", factura.numero),
                ("Estado", factura.get_estado_display()),
                ("Fecha", str(factura.fecha_emision)),
                ("Subtotal", f"${factura.subtotal:,.2f}"),
                ("IVA", f"${factura.iva_total:,.2f}"),
                ("Total", f"${factura.total:,.2f}"),
                ("Pagado", f"${factura.total_pagado:,.2f}"),
                ("Saldo", f"${factura.saldo_pendiente:,.2f}"),
            ],
        ),
        ("Ítems", item_rows or [("—", "Sin ítems")]),
    ]
    subtitle = " · ".join(
        x for x in [empresa.nit and f"NIT {empresa.nit}", empresa.telefono, empresa.email] if x
    )
    return render_simple_pdf(
        f"Factura {factura.numero}",
        sections,
        logo_url=empresa.logo_url or "",
        empresa_subtitle=subtitle,
    )
