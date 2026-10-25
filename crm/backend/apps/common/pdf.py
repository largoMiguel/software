from __future__ import annotations

import tempfile
import urllib.request
from pathlib import Path

from fpdf import FPDF


class DocumentoPDF(FPDF):
    def header(self):
        if getattr(self, "logo_path", None):
            try:
                self.image(self.logo_path, x=10, y=8, h=18)
                self.set_xy(10, 30)
            except Exception:
                pass
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, self.title_text, ln=True, align="C")
        if getattr(self, "empresa_subtitle", ""):
            self.set_font("Helvetica", "", 10)
            self.cell(0, 6, self.empresa_subtitle, ln=True, align="C")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")


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
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, heading, ln=True)
        pdf.set_font("Helvetica", "", 10)
        for label, value in rows:
            pdf.multi_cell(0, 6, f"{label}: {value}")
        pdf.ln(2)

    out = pdf.output(dest="S")
    if logo_path:
        try:
            Path(logo_path).unlink(missing_ok=True)
        except OSError:
            pass
    return out
