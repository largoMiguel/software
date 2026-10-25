from __future__ import annotations

import tempfile
import urllib.request
from pathlib import Path

from fpdf import FPDF

_EMPTY = "N/D"


def pdf_safe_text(value: object) -> str:
    """Helvetica solo admite Latin-1; normaliza guiones y caracteres fuera de rango."""
    text = str(value) if value is not None else _EMPTY
    text = (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )
    return text.encode("latin-1", errors="replace").decode("latin-1")


class DocumentoPDF(FPDF):
    def header(self):
        self.set_x(self.l_margin)
        if getattr(self, "logo_path", None):
            try:
                self.image(self.logo_path, x=10, y=8, h=18)
                self.set_y(30)
            except Exception:
                pass
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, pdf_safe_text(self.title_text), ln=True, align="C")
        if getattr(self, "empresa_subtitle", ""):
            self.set_x(self.l_margin)
            self.set_font("Helvetica", "", 10)
            self.cell(0, 6, pdf_safe_text(self.empresa_subtitle), ln=True, align="C")
        self.ln(4)
        self.set_x(self.l_margin)

    def footer(self):
        self.set_y(-15)
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Pagina {self.page_no()}", align="C")


def _download_logo(logo_url: str) -> str | None:
    if not logo_url:
        return None
    try:
        suffix = ".png"
        lower = logo_url.lower()
        if ".jpg" in lower or ".jpeg" in lower:
            suffix = ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            urllib.request.urlretrieve(logo_url, tmp.name)
            return tmp.name
    except Exception:
        return None


def render_simple_pdf(
    title: str,
    sections: list[tuple[str, list[tuple[str, str]]]],
    *,
    logo_url: str = "",
    empresa_subtitle: str = "",
) -> bytes:
    logo_path = _download_logo(logo_url)
    pdf = DocumentoPDF()
    pdf.title_text = title
    pdf.empresa_subtitle = empresa_subtitle
    if logo_path:
        pdf.logo_path = logo_path
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "", 10)

    for heading, rows in sections:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(pdf.epw, 8, pdf_safe_text(heading), ln=True)
        pdf.set_font("Helvetica", "", 10)
        for label, value in rows:
            pdf.set_x(pdf.l_margin)
            line = f"{pdf_safe_text(label)}: {pdf_safe_text(value)}"
            pdf.multi_cell(pdf.epw, 6, line)
        pdf.ln(2)

    out = bytes(pdf.output())
    if logo_path:
        try:
            Path(logo_path).unlink(missing_ok=True)
        except OSError:
            pass
    return out


def pdf_http_response(data: bytes, filename: str, *, inline: bool = True) -> "HttpResponse":
    from django.http import HttpResponse

    safe = filename.replace('"', "").strip() or "documento.pdf"
    if not safe.lower().endswith(".pdf"):
        safe = f"{safe}.pdf"
    disposition = "inline" if inline else "attachment"
    response = HttpResponse(data, content_type="application/pdf")
    response["Content-Disposition"] = f'{disposition}; filename="{safe}"'
    return response
