from __future__ import annotations

from apps.common.pdf import render_simple_pdf
from apps.cotizaciones.models import Cotizacion


def cotizacion_pdf_bytes(cotizacion: Cotizacion) -> bytes:
    empresa = cotizacion.empresa
    cliente = cotizacion.cliente
    item_rows = []
    for item in cotizacion.items.all():
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
            "Cotización",
            [
                ("Número", cotizacion.numero),
                ("Estado", cotizacion.get_estado_display()),
                ("Fecha", str(cotizacion.fecha_emision)),
                ("Subtotal", f"${cotizacion.subtotal:,.2f}"),
                ("IVA", f"${cotizacion.iva_total:,.2f}"),
                ("Total", f"${cotizacion.total:,.2f}"),
            ],
        ),
        ("Ítems", item_rows or [("—", "Sin ítems")]),
    ]
    subtitle = " · ".join(
        x for x in [empresa.nit and f"NIT {empresa.nit}", empresa.telefono, empresa.email] if x
    )
    return render_simple_pdf(
        f"Cotización {cotizacion.numero}",
        sections,
        logo_url=empresa.logo_url or "",
        empresa_subtitle=subtitle,
    )
