from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Sequence

from fpdf import FPDF

from apps.common.pdf import _download_logo, pdf_safe_text

# SoftOne CRM brand
COLOR_PRIMARY = (62, 175, 212)
COLOR_HEADER_TEXT = (255, 255, 255)
COLOR_ROW_ALT = (248, 251, 255)
COLOR_BORDER = (203, 213, 225)


@dataclass
class DocumentParty:
    titulo: str
    lineas: list[str]


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


@dataclass
class CommercialDocumentPdf:
    tipo_titulo: str
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
    emisor: DocumentParty
    cliente: DocumentParty
    notas: str
    filas: Sequence[DocumentLineRow]
    totales: DocumentTotals


def _money(value: Decimal | float) -> str:
    return f"${Decimal(value):,.2f}"


class _DocPDF(FPDF):
    def __init__(self, doc: CommercialDocumentPdf):
        super().__init__()
        self.doc = doc
        self.logo_path = _download_logo(doc.logo_url)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 8, pdf_safe_text(f"Pagina {self.page_no()}"), align="C")


def render_commercial_document_pdf(doc: CommercialDocumentPdf) -> bytes:
    pdf = _DocPDF(doc)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # --- Encabezado corporativo ---
    y0 = pdf.get_y()
    pdf.set_fill_color(*COLOR_PRIMARY)
    pdf.rect(0, 0, pdf.w, 38, style="F")

    if pdf.logo_path:
        try:
            pdf.image(pdf.logo_path, x=10, y=6, h=14)
        except Exception:
            pass

    pdf.set_xy(10, 8 if pdf.logo_path else 10)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*COLOR_HEADER_TEXT)
    pdf.cell(0, 7, pdf_safe_text(doc.empresa_nombre), ln=True)
    pdf.set_font("Helvetica", "", 9)
    meta = " · ".join(
        x
        for x in [
            doc.empresa_nit and f"NIT {doc.empresa_nit}",
            doc.empresa_telefono,
            doc.empresa_email,
        ]
        if x
    )
    if meta:
        pdf.cell(0, 5, pdf_safe_text(meta), ln=True)

    pdf.set_xy(pdf.w - 70, 10)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(60, 6, pdf_safe_text(doc.tipo_titulo), align="R", ln=True)
    pdf.set_x(pdf.w - 70)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 5, pdf_safe_text(doc.numero), align="R", ln=True)
    pdf.set_x(pdf.w - 70)
    pdf.cell(60, 5, pdf_safe_text(f"Fecha: {doc.fecha_emision}"), align="R", ln=True)
    if doc.fecha_vencimiento:
        pdf.set_x(pdf.w - 70)
        pdf.cell(60, 5, pdf_safe_text(f"Valido hasta: {doc.fecha_vencimiento}"), align="R", ln=True)
    pdf.set_x(pdf.w - 70)
    pdf.cell(60, 5, pdf_safe_text(f"Estado: {doc.estado}"), align="R", ln=True)

    pdf.set_y(44)
    pdf.set_text_color(30, 41, 59)

    # --- Bloques emisor / cliente ---
    col_w = (pdf.w - 20) / 2
    y_block = pdf.get_y()
    for idx, party in enumerate((doc.emisor, doc.cliente)):
        x = 10 + idx * (col_w + 0)
        pdf.set_xy(x, y_block)
        pdf.set_fill_color(*COLOR_ROW_ALT)
        pdf.set_draw_color(*COLOR_BORDER)
        pdf.rect(x, y_block, col_w - 4, 28, style="DF")
        pdf.set_xy(x + 3, y_block + 3)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(col_w - 10, 5, pdf_safe_text(party.titulo))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(x + 3, y_block + 9)
        for line in party.lineas[:4]:
            pdf.multi_cell(col_w - 10, 4.5, pdf_safe_text(line))

    pdf.set_y(y_block + 32)

    # --- Tabla de lineas ---
    headers = ["#", "Descripcion", "Cant.", "V. unit.", "Dto%", "IVA%", "Subtotal", "Total"]
    widths = [8, 62, 14, 22, 12, 12, 24, 24]
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(*COLOR_PRIMARY)
    pdf.set_text_color(*COLOR_HEADER_TEXT)
    pdf.set_draw_color(*COLOR_BORDER)
    for h, w in zip(headers, widths):
        pdf.cell(w, 7, pdf_safe_text(h), border=1, align="C", fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(30, 41, 59)
    for i, row in enumerate(doc.filas, start=1):
        if i % 2 == 0:
            pdf.set_fill_color(*COLOR_ROW_ALT)
        else:
            pdf.set_fill_color(255, 255, 255)
        cells = [
            str(i),
            row.descripcion[:80],
            f"{row.cantidad:.2f}",
            _money(row.precio_unitario),
            f"{row.descuento_porcentaje:.0f}",
            f"{row.iva_porcentaje:.0f}",
            _money(row.subtotal_linea),
            _money(row.total_linea),
        ]
        aligns = ["C", "L", "R", "R", "R", "R", "R", "R"]
        for text, w, align in zip(cells, widths, aligns):
            pdf.cell(w, 6, pdf_safe_text(text), border=1, align=align, fill=True)
        pdf.ln()

    pdf.ln(4)
    box_w = 70
    box_x = pdf.w - 10 - box_w
    pdf.set_xy(box_x, pdf.get_y())
    pdf.set_font("Helvetica", "", 9)
    for label, amount in (
        ("Subtotal", doc.totales.subtotal),
        ("IVA", doc.totales.iva),
        ("Total", doc.totales.total),
    ):
        pdf.set_x(box_x)
        pdf.cell(box_w / 2, 6, pdf_safe_text(label), border=0, align="R")
        pdf.set_font("Helvetica", "B" if label == "Total" else "", 9)
        pdf.cell(box_w / 2, 6, pdf_safe_text(_money(amount)), border=0, align="R")
        pdf.ln(6)
        pdf.set_font("Helvetica", "", 9)

    if doc.notas.strip():
        pdf.ln(4)
        pdf.set_x(10)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 5, pdf_safe_text("Notas"), ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_x(10)
        pdf.multi_cell(pdf.w - 20, 5, pdf_safe_text(doc.notas.strip()))

    out = bytes(pdf.output())
    if pdf.logo_path:
        from pathlib import Path

        try:
            Path(pdf.logo_path).unlink(missing_ok=True)
        except OSError:
            pass
    return out
