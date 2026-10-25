from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Literal, Sequence

from fpdf import FPDF

from apps.common.pdf import download_logo_file, pdf_safe_text

DocumentKind = Literal["cotizacion", "factura"]

THEME = {
    "cotizacion": {
        "title": "COTIZACION",
        "accent": (14, 116, 144),
        "title_size": 26,
        "badge": "Documento comercial - no es factura electronica",
    },
    "factura": {
        "title": "FACTURA",
        "accent": (30, 58, 95),
        "title_size": 28,
        "badge": "Documento de cobro interno",
    },
}

COLOR_TEXT = (30, 41, 59)
COLOR_MUTED = (100, 116, 139)
COLOR_LINE = (180, 83, 75)


@dataclass
class DocumentLineRow:
    descripcion: str
    cantidad: Decimal
    precio_unitario: Decimal
    descuento_porcentaje: Decimal
    iva_porcentaje: Decimal
    subtotal_linea: Decimal
    iva_linea: Decimal
    total_linea: Decimal


@dataclass
class DocumentTotals:
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    iva_etiqueta: str = "IVA"


@dataclass
class CommercialDocumentPdf:
    document_kind: DocumentKind
    numero: str
    fecha_emision: str
    fecha_vencimiento: str | None
    estado: str
    empresa_nombre: str
    empresa_nit: str
    empresa_direccion: str
    empresa_telefono: str
    empresa_email: str
    logo_url: str
    cliente_nombre: str
    cliente_documento: str
    cliente_direccion: str
    cliente_email: str
    cliente_telefono: str
    condiciones: str
    filas: Sequence[DocumentLineRow]
    totales: DocumentTotals
    extra_totales: list[tuple[str, str]] | None = None
    vendedor_nombre: str = ""


def _money(value: Decimal | float) -> str:
    return f"${Decimal(value):,.2f}"


class _DocPDF(FPDF):
    def __init__(self, doc: CommercialDocumentPdf):
        super().__init__()
        self.doc = doc
        self.logo_path = download_logo_file(doc.logo_url)
        self.theme = THEME[doc.document_kind]

    def footer(self):
        self.set_y(-10)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*COLOR_MUTED)
        self.cell(0, 5, pdf_safe_text(f"Generado por SoftOne CRM · Pagina {self.page_no()}"), align="C")


def _accent_line(
    pdf: FPDF, accent: tuple[int, int, int], y: float | None = None, thickness: float = 0.4
) -> None:
    pdf.set_draw_color(*accent)
    pdf.set_line_width(thickness)
    y = y if y is not None else pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)


def _coral_line(pdf: FPDF, y: float) -> None:
    pdf.set_draw_color(*COLOR_LINE)
    pdf.set_line_width(0.35)
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)


LOGO_BOX_MM = 24.0
LOGO_TOP_MM = 14.0


def _draw_logo(pdf: FPDF, logo_path: str | None, logo_x: float) -> float:
    """Incrusta logo dentro de un cuadro fijo; devuelve Y inferior del encabezado."""
    y = LOGO_TOP_MM
    box = LOGO_BOX_MM
    if logo_path:
        try:
            pdf.image(logo_path, x=logo_x, y=y, w=box, h=box, keep_aspect_ratio=True)
        except Exception:
            pdf.set_xy(logo_x, y)
            pdf.set_fill_color(230, 230, 230)
            pdf.rect(logo_x, y, box, box, style="F")
            pdf.set_xy(logo_x, y + box / 2 - 3)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*COLOR_MUTED)
            pdf.cell(box, 6, pdf_safe_text("LOGO"), align="C")
    else:
        pdf.set_xy(logo_x, y)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_draw_color(*COLOR_MUTED)
        pdf.rect(logo_x, y, box, box, style="DF")
        pdf.set_xy(logo_x, y + box / 2 - 3)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.cell(box, 6, pdf_safe_text("LOGO"), align="C")
    return y + box


def render_commercial_document_pdf(doc: CommercialDocumentPdf) -> bytes:
    pdf = _DocPDF(doc)
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.add_page()
    theme = pdf.theme
    accent = theme["accent"]

    # --- Titulo + logo (estilo plantilla profesional) ---
    pdf.set_xy(pdf.l_margin, 14)
    pdf.set_font("Helvetica", "B", theme["title_size"])
    pdf.set_text_color(*accent)
    pdf.cell(100, 10, pdf_safe_text(theme["title"]))

    logo_x = pdf.w - pdf.r_margin - LOGO_BOX_MM
    logo_bottom = _draw_logo(pdf, pdf.logo_path, logo_x)

    text_w = max(40.0, logo_x - pdf.l_margin - 4)
    pdf.set_xy(pdf.l_margin, 26)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.multi_cell(text_w, 5, pdf_safe_text(doc.empresa_nombre))
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 9)
    if doc.empresa_direccion:
        pdf.multi_cell(text_w, 4.5, pdf_safe_text(doc.empresa_direccion))
    nit_line = doc.empresa_nit and f"NIT {doc.empresa_nit}" or ""
    contact = " · ".join(x for x in [nit_line, doc.empresa_telefono, doc.empresa_email] if x)
    if contact:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(text_w, 4.5, pdf_safe_text(contact))

    header_bottom = max(pdf.get_y(), logo_bottom) + 3
    pdf.set_y(header_bottom)
    _accent_line(pdf, accent, y=header_bottom)
    pdf.set_y(header_bottom + 5)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*accent)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 4, pdf_safe_text(theme["badge"]))
    pdf.ln(2)

    # --- Cliente + datos documento (columnas sin solaparse) ---
    epw = pdf.epw
    left_w = epw * 0.52
    meta_x = pdf.l_margin + left_w + 4
    meta_label_w = 38
    meta_value_w = epw - left_w - 4 - meta_label_w
    y0 = pdf.get_y()

    pdf.set_xy(pdf.l_margin, y0)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*accent)
    pdf.cell(left_w, 5, pdf_safe_text("FACTURAR A"))

    label_num = "N DE COTIZACION" if doc.document_kind == "cotizacion" else "N DE FACTURA"
    pdf.set_xy(meta_x, y0)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*COLOR_MUTED)
    pdf.cell(meta_label_w, 5, pdf_safe_text(label_num))
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.cell(meta_value_w, 5, pdf_safe_text(doc.numero))

    y_left = y0 + 6
    pdf.set_xy(pdf.l_margin, y_left)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.multi_cell(left_w, 5, pdf_safe_text(doc.cliente_nombre))
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(left_w, 4.5, pdf_safe_text(doc.cliente_documento))
    if doc.cliente_direccion:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(left_w, 4.5, pdf_safe_text(doc.cliente_direccion))
    client_contact = " · ".join(x for x in [doc.cliente_telefono, doc.cliente_email] if x)
    if client_contact:
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(left_w, 4.5, pdf_safe_text(client_contact))
    y_left_end = pdf.get_y()

    y_meta = y0 + 6
    for label, value in (
        ("FECHA", doc.fecha_emision),
        ("VENCIMIENTO", doc.fecha_vencimiento or "N/D"),
        ("ESTADO", doc.estado),
    ):
        pdf.set_xy(meta_x, y_meta)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.cell(meta_label_w, 4.5, pdf_safe_text(label))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*COLOR_TEXT)
        pdf.multi_cell(meta_value_w, 4.5, pdf_safe_text(value))
        y_meta = pdf.get_y() + 0.5

    pdf.set_y(max(y_left_end, y_meta) + 6)

    # --- Tabla ---
    y_table = pdf.get_y()
    _coral_line(pdf, y_table)
    pdf.ln(1)
    _coral_line(pdf, pdf.get_y())
    pdf.ln(2)

    headers = ["CANT.", "DESCRIPCION", "PRECIO UNITARIO", "IMPORTE"]
    widths = [epw * 0.09, epw * 0.49, epw * 0.21, epw * 0.21]
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*accent)
    for h, w in zip(headers, widths):
        pdf.cell(w, 7, pdf_safe_text(h), align="L" if h == "DESCRIPCION" else "R")
    pdf.ln(8)
    _coral_line(pdf, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*COLOR_TEXT)
    if not doc.filas:
        pdf.set_x(pdf.l_margin)
        pdf.cell(epw, 6, pdf_safe_text("Sin lineas"), ln=True)
    for row in doc.filas:
        desc = row.descripcion
        if row.descuento_porcentaje and row.descuento_porcentaje > 0:
            desc += f" (Dto {row.descuento_porcentaje:.0f}%)"
        x0 = pdf.l_margin
        y0 = pdf.get_y()
        line_h = 5
        pdf.set_xy(x0 + widths[0], y0)
        pdf.multi_cell(widths[1], line_h, pdf_safe_text(desc))
        row_h = max(6.0, pdf.get_y() - y0)
        pdf.set_xy(x0, y0)
        pdf.cell(widths[0], row_h, pdf_safe_text(f"{row.cantidad:.2f}"), align="R")
        pdf.set_xy(x0 + widths[0] + widths[1], y0)
        pdf.cell(widths[2], row_h, pdf_safe_text(_money(row.precio_unitario)), align="R")
        pdf.set_xy(x0 + widths[0] + widths[1] + widths[2], y0)
        pdf.cell(widths[3], row_h, pdf_safe_text(_money(row.total_linea)), align="R")
        pdf.set_y(y0 + row_h)

    pdf.ln(4)
    _coral_line(pdf, pdf.get_y())
    pdf.ln(6)

    # --- Totales ---
    box_w = 78
    box_x = pdf.w - pdf.r_margin - box_w
    pdf.set_font("Helvetica", "", 10)
    for label, amount in (
        ("Subtotal", doc.totales.subtotal),
        (doc.totales.iva_etiqueta, doc.totales.iva),
    ):
        pdf.set_x(box_x)
        pdf.cell(box_w / 2, 6, pdf_safe_text(label), align="R")
        pdf.cell(box_w / 2, 6, pdf_safe_text(_money(amount)), align="R", ln=True)

    if doc.extra_totales:
        for label, amount in doc.extra_totales:
            pdf.set_x(box_x)
            pdf.cell(box_w / 2, 6, pdf_safe_text(label), align="R")
            pdf.cell(box_w / 2, 6, pdf_safe_text(amount), align="R", ln=True)

    pdf.set_x(box_x)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*accent)
    pdf.cell(box_w / 2, 8, pdf_safe_text("TOTAL"), align="R")
    pdf.cell(box_w / 2, 8, pdf_safe_text(_money(doc.totales.total)), align="R", ln=True)
    pdf.set_text_color(*COLOR_TEXT)

    pdf.ln(10)

    # --- Firmas ---
    if pdf.get_y() > pdf.h - 55:
        pdf.add_page()

    sig_w = (epw - 8) / 2
    y_sig = pdf.get_y()
    cliente_sub = " · ".join(x for x in [doc.cliente_nombre, doc.cliente_documento] if x)
    vendedor_sub = doc.vendedor_nombre.strip() or "Vendedor"
    for idx, (titulo, subtitulo) in enumerate(
        (
            ("Firma del cliente", cliente_sub),
            ("Firma del vendedor", vendedor_sub),
        )
    ):
        x = pdf.l_margin + idx * (sig_w + 8)
        pdf.set_xy(x, y_sig)
        pdf.set_draw_color(*COLOR_MUTED)
        pdf.line(x, y_sig + 22, x + sig_w, y_sig + 22)
        pdf.set_xy(x, y_sig + 24)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*COLOR_TEXT)
        pdf.cell(sig_w, 5, pdf_safe_text(titulo))
        pdf.set_xy(x, y_sig + 29)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.multi_cell(sig_w, 4, pdf_safe_text(subtitulo))

    pdf.set_text_color(*COLOR_TEXT)
    pdf.set_y(y_sig + 38)

    # --- Condiciones ---
    if doc.condiciones.strip():
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*COLOR_LINE)
        pdf.cell(0, 5, pdf_safe_text("CONDICIONES Y FORMA DE PAGO"), ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*COLOR_TEXT)
        pdf.multi_cell(pdf.w - pdf.l_margin * 2, 5, pdf_safe_text(doc.condiciones.strip()))

    out = bytes(pdf.output())
    if pdf.logo_path:
        try:
            Path(pdf.logo_path).unlink(missing_ok=True)
        except OSError:
            pass
    return out
