# pdf_report.py
# ClearHeat branded PDF generator (professional, wrapped text, headers/footers, cover page)
from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics


# -------------------------
# ClearHeat brand palette
# -------------------------
COLOR_PRIMARY = HexColor("#1F3A5F")   # deep blue
COLOR_MUTED   = HexColor("#6B7280")   # grey
COLOR_LIGHT   = HexColor("#EEF2F6")   # very light grey-blue
COLOR_BOX_BG  = HexColor("#F7F9FB")   # soft paper tint

COLOR_GREEN   = HexColor("#2E7D32")   # verdict accent
COLOR_AMBER   = HexColor("#ED6C02")
COLOR_RED     = HexColor("#C62828")


# -------------------------
# Formatting helpers
# -------------------------
def eur(x: Any) -> str:
    try:
        return f"€{float(x):,.0f}"
    except Exception:
        return "—"


def num(x: Any, unit: str = "", decimals: int = 0) -> str:
    try:
        fmt = f"{{:.{decimals}f}}"
        s = fmt.format(float(x))
        return f"{s}{(' ' + unit) if unit else ''}"
    except Exception:
        return "—"


def payback_text(x: Any) -> str:
    if x is None:
        return "No payback"
    try:
        v = float(x)
        if v != v:  # NaN
            return "No payback"
        return f"{v:.1f} years"
    except Exception:
        return "—"


def verdict_accent(verdict_text: str) -> Color:
    t = (verdict_text or "").lower()
    if "likely" in t:
        return COLOR_GREEN
    if "borderline" in t:
        return COLOR_AMBER
    return COLOR_RED


# -------------------------
# Text wrapping (prevents right-side overflow)
# -------------------------
def _wrap_lines(text: str, font_name: str, font_size: float, max_width: float) -> List[str]:
    """Greedy word wrap using ReportLab font metrics."""
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    out: List[str] = []
    for para in text.split("\n"):
        para = para.strip()
        if not para:
            out.append("")
            continue

        words = para.split()
        line = ""
        for w in words:
            trial = w if not line else f"{line} {w}"
            if pdfmetrics.stringWidth(trial, font_name, font_size) <= max_width:
                line = trial
            else:
                if line:
                    out.append(line)
                if pdfmetrics.stringWidth(w, font_name, font_size) <= max_width:
                    line = w
                else:
                    chunk = ""
                    for ch in w:
                        trial2 = chunk + ch
                        if pdfmetrics.stringWidth(trial2, font_name, font_size) <= max_width:
                            chunk = trial2
                        else:
                            if chunk:
                                out.append(chunk)
                            chunk = ch
                    line = chunk
        if line:
            out.append(line)
    return out


def draw_wrapped_text(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    max_width: float,
    font_name: str = "Helvetica",
    font_size: float = 10,
    leading: float = 14,
    color: Any = None,
) -> float:
    if color is not None:
        c.setFillColor(color)
    c.setFont(font_name, font_size)
    for line in _wrap_lines(text, font_name, font_size, max_width):
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(
    c: canvas.Canvas,
    x: float,
    y: float,
    bullets: List[str],
    max_width: float,
    bullet_indent: float = 4 * mm,
    font_name: str = "Helvetica",
    font_size: float = 10,
    leading: float = 14,
) -> float:
    c.setFont(font_name, font_size)
    for b in bullets or []:
        wrapped = _wrap_lines(str(b), font_name, font_size, max_width - bullet_indent - 3*mm)
        if wrapped:
            c.drawString(x, y, "•")
            c.drawString(x + bullet_indent, y, wrapped[0])
            y -= leading
            for line in wrapped[1:]:
                c.drawString(x + bullet_indent, y, line)
                y -= leading
        else:
            c.drawString(x, y, "•")
            y -= leading
    return y


# -------------------------
# Layout primitives (law-firm-ish)
# -------------------------
def draw_header_footer(
    c: canvas.Canvas,
    page_num: int,
    total_pages: int,
    W: float,
    H: float,
    margin: float,
    subtitle: str = "Independent Heat Pump Payback Assessment",
) -> None:
    c.setStrokeColor(COLOR_LIGHT)
    c.setLineWidth(0.7)
    c.line(margin, H - margin + 4*mm, W - margin, H - margin + 4*mm)

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin, H - margin + 7.5*mm, "ClearHeat")
    c.setFont("Helvetica", 9)
    c.setFillColor(COLOR_MUTED)
    c.drawRightString(W - margin, H - margin + 7.5*mm, subtitle)

    c.setStrokeColor(COLOR_LIGHT)
    c.setLineWidth(0.7)
    c.line(margin, margin - 6*mm, W - margin, margin - 6*mm)

    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(margin, margin - 10*mm, "Not affiliated with installers, manufacturers, or grant providers.")
    c.drawRightString(W - margin, margin - 10*mm, f"Page {page_num} of {total_pages}")


def draw_section_title(c: canvas.Canvas, x: float, y: float, title: str) -> float:
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y, title)
    return y - 7*mm


def draw_soft_box(c: canvas.Canvas, x: float, y_top: float, w: float, h: float) -> None:
    c.setFillColor(COLOR_BOX_BG)
    c.setStrokeColor(COLOR_LIGHT)
    c.setLineWidth(0.8)
    c.roundRect(x, y_top - h, w, h, radius=3*mm, stroke=1, fill=1)


# -------------------------
# Public API
# -------------------------
def build_pdf(report: Dict[str, Any]) -> bytes:
    """Build a 3-page ClearHeat PDF with cover, decision page, and methodology/disclaimer."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    margin = 18 * mm
    x0 = margin
    usable_w = W - 2 * margin

    meta = report.get("meta", {})
    inp = report.get("inputs", {})
    dec = report.get("decision", {})

    verdict_text = dec.get("verdict_text") or str(dec.get("verdict", "—")).replace("_", " ").title()
    confidence_text = dec.get("confidence_text") or str(dec.get("confidence", "—")).title()
    accent = verdict_accent(verdict_text)

    total_pages = 3

    # PAGE 1 — COVER
    draw_header_footer(c, 1, total_pages, W, H, margin, subtitle="Independent Payback Assessment")
    y = H - margin - 14*mm

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(x0, y, "ClearHeat")
    y -= 7*mm
    c.setFont("Helvetica", 11)
    c.setFillColor(COLOR_MUTED)
    c.drawString(x0, y, "Independent heat pump payback report for Irish homes")
    y -= 18*mm

    box_h = 56 * mm
    draw_soft_box(c, x0, y, usable_w, box_h)

    c.setFillColor(accent)
    c.rect(x0, y - box_h, 5*mm, box_h, stroke=0, fill=1)

    c.setFillColor(COLOR_PRIMARY)
    y_v = y - 14*mm
    y_v = draw_wrapped_text(
        c, x0 + 10*mm, y_v,
        f"Verdict: {verdict_text}",
        max_width=usable_w - 14*mm,
        font_name="Helvetica-Bold",
        font_size=18,
        leading=20,
        color=COLOR_PRIMARY,
    )

    c.setFont("Helvetica", 12)
    c.setFillColor(COLOR_PRIMARY)
    c.drawString(x0 + 10*mm, y - 36*mm, f"Confidence: {confidence_text}")

    expl = (
        "This is a screening assessment designed to help you make a decision before committing to major spend. "
        "It provides a defensible range (best / typical / worst) and an independent verdict based on your inputs."
    )
    c.setFillColor("black")
    _ = draw_wrapped_text(c, x0 + 10*mm, y - 46*mm, expl, usable_w - 14*mm, font_name="Helvetica", font_size=10, leading=13, color="black")

    y -= box_h + 14*mm

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x0, y, "Report details")
    y -= 6*mm

    c.setFillColor("black")
    c.setFont("Helvetica", 10)
    details = [
        f"Generated: {meta.get('generated_at_utc','—')}",
        f"BER band: {inp.get('ber_band','—')}   |   Floor area: {num(inp.get('floor_area_m2'), 'm²', 0)}",
        f"Primary fuel: {inp.get('fuel_type','—')}   |   Emitters: {inp.get('emitters','—')}",
    ]
    for line in details:
        y = draw_wrapped_text(c, x0, y, line, usable_w, font_name="Helvetica", font_size=10, leading=13, color="black")

    c.showPage()

    # PAGE 2 — DECISION
    draw_header_footer(c, 2, total_pages, W, H, margin)
    y = H - margin - 14*mm

    y = draw_section_title(c, x0, y, "What this means for you")
    c.setFillColor("black")
    bullets = dec.get("what_this_means", []) or [
        "This result is a screening estimate. Use it to decide whether to proceed to a detailed design assessment."
    ]
    y = draw_bullets(c, x0, y, bullets, max_width=usable_w, font_size=10, leading=13)
    y -= 4*mm

    y = draw_section_title(c, x0, y, "Key numbers (typical scenario)")
    c.setFont("Helvetica", 10)
    c.setFillColor("black")
    c.drawString(x0, y, f"Estimated annual savings: {eur(dec.get('typical_savings_eur'))}")
    y -= 6*mm
    c.drawString(x0, y, f"Simple payback period: {payback_text(dec.get('typical_payback_years'))}")
    y -= 10*mm

    drivers = dec.get("key_drivers", []) or []
    if drivers:
        y = draw_section_title(c, x0, y, "Key drivers")
        c.setFillColor("black")
        y = draw_bullets(c, x0, y, drivers[:6], max_width=usable_w, font_size=10, leading=13)
        y -= 4*mm

    y = draw_section_title(c, x0, y, "Summary of inputs")
    c.setFillColor("black")
    c.setFont("Helvetica", 9)

    input_lines = [
        f"BER band: {inp.get('ber_band','—')} • Floor area: {num(inp.get('floor_area_m2'), 'm²', 0)} • Occupants: {num(inp.get('occupants'), '', 0)}",
        f"Heating pattern: {inp.get('heating_pattern','—')} • Wood use: {inp.get('wood_use','—')} • Emitters: {inp.get('emitters','—')}",
        f"Fuel: {inp.get('fuel_type','—')} at {inp.get('fuel_price_eur_per_unit','—')} per unit • Boiler efficiency: {num(inp.get('boiler_efficiency'), '', 2)}",
        f"Electricity price: €{inp.get('electricity_price_eur_per_kwh','—')}/kWh • Heat pump quote: {eur(inp.get('hp_quote_eur'))} • Net capex: {eur(inp.get('hp_capex_eur'))}",
    ]
    for line in input_lines:
        y = draw_wrapped_text(c, x0, y, line, usable_w, font_name="Helvetica", font_size=9, leading=11, color="black")
        y -= 1*mm

    c.showPage()

    # PAGE 3 — METHOD & DISCLAIMER
    draw_header_footer(c, 3, total_pages, W, H, margin, subtitle="Methodology, assumptions and disclaimer")
    y = H - margin - 14*mm

    y = draw_section_title(c, x0, y, "How ClearHeat reaches its conclusion")
    overview = (
        "ClearHeat is a screening-level assessment. It estimates annual delivered heat demand using your BER band "
        "and floor area (space heating) plus a simple domestic hot water (DHW) allowance based on occupants. "
        "It then compares the estimated annual running cost of your current heating system against a heat pump using "
        "a seasonal performance range (SCOP) appropriate to your emitter type (radiators vs underfloor heating). "
        "Results are presented as best / typical / worst cases to reflect uncertainty in insulation quality, system design "
        "and commissioning, energy prices, and real-world usage."
    )
    c.setFillColor("black")
    y = draw_wrapped_text(c, x0, y, overview, usable_w, font_name="Helvetica", font_size=10, leading=13, color="black")
    y -= 6*mm

    y = draw_section_title(c, x0, y, "Key assumptions")
    assumptions = [
        "This report is not a detailed design survey and does not replace an installer’s heat loss calculation.",
        "Heat pump performance is represented by a seasonal COP (SCOP) range; real performance depends strongly on flow temperatures and commissioning quality.",
        "BER-based estimates rely on standardised assumptions; bills-based inputs (annual spend or fuel use) are preferred when available.",
        "Secondary heating (e.g., wood stoves) is treated as an offset only in the BER-based pathway; bills-based results already reflect your real behaviour.",
        "The payback shown is a simple payback (capital cost / annual savings). Finance costs and future price changes are not included.",
    ]
    c.setFillColor("black")
    y = draw_bullets(c, x0, y, assumptions, max_width=usable_w, font_size=10, leading=13)
    y -= 6*mm

    y = draw_section_title(c, x0, y, "How to interpret confidence")
    conf_text = (
        "Confidence reflects whether the conclusion stays the same across realistic scenarios. "
        "If best, typical and worst cases agree, confidence is higher. "
        "If the result flips between saving and losing, confidence is lower and further investigation is recommended."
    )
    c.setFillColor("black")
    y = draw_wrapped_text(c, x0, y, conf_text, usable_w, font_name="Helvetica", font_size=10, leading=13, color="black")
    y -= 8*mm

    y = draw_section_title(c, x0, y, "Important disclaimer")
    disclaimer = report.get("disclaimer", "") or (
        "This assessment is provided for informational purposes only and does not constitute engineering design advice. "
        "Actual performance and costs may differ due to system sizing, installation quality, radiator suitability, controls, "
        "house condition, occupant behaviour, weather variation, and energy price changes. "
        "You should obtain a detailed heat loss calculation and system design from a competent professional before proceeding."
    )
    c.setFillColor("black")
    _ = draw_wrapped_text(c, x0, y, disclaimer, usable_w, font_name="Helvetica", font_size=9, leading=12, color="black")

    c.save()
    return buf.getvalue()
