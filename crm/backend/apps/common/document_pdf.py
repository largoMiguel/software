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

    logo_x = pdf.w - pdf.r_margin - 38
    if pdf.logo_path:
        try:
            pdf.image(pdf.logo_path, x=logo_x, y=12, w=36, h=36)
        except Exception:
            pdf.set_xy(logo_x, 18)
            pdf.set_fill_color(230, 230, 230)
            pdf.rect(logo_x, 14, 36, 36, style="F")
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*COLOR_MUTED)
            pdf.cell(36, 36, pdf_safe_text("LOGO"), align="C")
    else:
        pdf.set_xy(logo_x, 14)
        pdf.set_fill_color(241, 245, 249)
        pdf.set_draw_color(*COLOR_MUTED)
        pdf.rect(logo_x, 14, 36, 36, style="DF")
        pdf.set_xy(logo_x, 28)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.cell(36, 6, pdf_safe_text("LOGO"), align="C")

    pdf.set_xy(pdf.l_margin, 28)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.cell(0, 5, pdf_safe_text(doc.empresa_nombre), ln=True)
    pdf.set_font("Helvetica", "", 9)
    if doc.empresa_direccion:
        pdf.cell(0, 4.5, pdf_safe_text(doc.empresa_direccion), ln=True)
    nit_line = doc.empresa_nit and f"NIT {doc.empresa_nit}" or ""
    contact = " · ".join(x for x in [nit_line, doc.empresa_telefono, doc.empresa_email] if x)
    if contact:
        pdf.cell(0, 4.5, pdf_safe_text(contact), ln=True)

    pdf.ln(2)
    _accent_line(pdf, accent)
    pdf.ln(4)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*accent)
    pdf.cell(0, 4, pdf_safe_text(theme["badge"]), ln=True)
    pdf.ln(2)

    # --- Cliente + datos documento ---
    y0 = pdf.get_y()
    col_left = 95
    col_right = pdf.w - pdf.r_margin

    pdf.set_xy(pdf.l_margin, y0)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*accent)
    pdf.cell(col_left, 5, pdf_safe_text("FACTURAR A"))

    pdf.set_font("Helvetica", "B", 9)
    label_num = "N DE COTIZACION" if doc.document_kind == "cotizacion" else "N DE FACTURA"
    pdf.set_xy(110, y0)
    pdf.cell(40, 5, pdf_safe_text(label_num))
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.cell(0, 5, pdf_safe_text(doc.numero), ln=True)

    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(col_left, 5, pdf_safe_text(doc.cliente_nombre), ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(col_left, 4.5, pdf_safe_text(doc.cliente_documento), ln=True)
    if doc.cliente_direccion:
        pdf.multi_cell(col_left, 4.5, pdf_safe_text(doc.cliente_direccion))
    client_contact = " · ".join(x for x in [doc.cliente_telefono, doc.cliente_email] if x)
    if client_contact:
        pdf.multi_cell(col_left, 4.5, pdf_safe_text(client_contact))

    y_meta = y0 + 5
    for label, value in (
        ("FECHA", doc.fecha_emision),
        ("VENCIMIENTO", doc.fecha_vencimiento or "N/D"),
        ("ESTADO", doc.estado),
    ):
        pdf.set_xy(110, y_meta)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.cell(40, 4.5, pdf_safe_text(label))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*COLOR_TEXT)
        pdf.cell(0, 4.5, pdf_safe_text(value), ln=False)
        y_meta += 5

    pdf.set_y(max(pdf.get_y(), y_meta) + 6)

    # --- Tabla ---
    y_table = pdf.get_y()
    _coral_line(pdf, y_table)
    pdf.ln(1)
    _coral_line(pdf, pdf.get_y())
    pdf.ln(2)

    headers = ["CANT.", "DESCRIPCION", "PRECIO UNITARIO", "IMPORTE"]
    widths = [16, 92, 38, 38]
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
        pdf.cell(0, 6, pdf_safe_text("Sin lineas"), ln=True)
    for row in doc.filas:
        pdf.cell(widths[0], 6, pdf_safe_text(f"{row.cantidad:.2f}"), align="R")
        desc = row.descripcion
        if row.descuento_porcentaje and row.descuento_porcentaje > 0:
            desc += f" (Dto {row.descuento_porcentaje:.0f}%)"
        pdf.cell(widths[1], 6, pdf_safe_text(desc[:70]))
        pdf.cell(widths[2], 6, pdf_safe_text(_money(row.precio_unitario)), align="R")
        pdf.cell(widths[3], 6, pdf_safe_text(_money(row.total_linea)), align="R")
        pdf.ln(6)

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

    sig_w = (pdf.w - 20 - 8) / 2
    y_sig = pdf.get_y()
    for idx, (titulo, subtitulo) in enumerate(
        (
            ("Firma del cliente", "Nombre y documento"),
            ("Firma del vendedor", "Nombre y cargo"),
        )
    ):
        x = pdf.l_margin + idx * (sig_w + 8)
        pdf.set_xy(x, y_sig)
        pdf.set_draw_color(*COLOR_MUTED)
        pdf.line(x, y_sig + 22, x + sig_w, y_sig + 22)
        pdf.set_xy(x, y_sig + 24)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(sig_w, 5, pdf_safe_text(titulo))
        pdf.set_xy(x, y_sig + 29)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*COLOR_MUTED)
        pdf.cell(sig_w, 4, pdf_safe_text(subtitulo))

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
