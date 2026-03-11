# pdf_report.py
# ClearHeat PDF generator — V2 refined
# - Cover page (no verdict) + contacts
# - Executive summary + scenario comparison table
# - Per-scenario pages with cumulative savings graph (0–20 years, 2-yr ticks)
# - Legend overlay box (auto-sized, always inside)
# - Break-even vertical drop line + label
# - Proper title/sentence casing, acronym-safe replacements (no "numBER")
# - Negative EUR formatting as "- €311"
# - Verdict colours fixed: Unlikely -> red

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
import re

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics


# =========================
# Brand palette
# =========================
COLOR_PRIMARY = HexColor("#1F3A5F")
COLOR_TEXT    = HexColor("#111827")
COLOR_MUTED   = HexColor("#6B7280")
COLOR_LINE    = HexColor("#E5E7EB")
COLOR_PANEL   = HexColor("#F7F9FB")

COLOR_GREEN   = HexColor("#2E7D32")
COLOR_AMBER   = HexColor("#ED6C02")
COLOR_RED     = HexColor("#C62828")


# =========================
# Formatting helpers
# =========================
ACRONYMS = {"NPV", "SCOP", "COP", "BER", "DHW", "SEAI", "KWH", "KWH/YR"}

def eur(x: Any) -> str:
    """Format EUR with visible negative sign (space after sign)."""
    try:
        v = float(x)
        if v < 0:
            return f"- €{abs(v):,.0f}"
        return f"€{v:,.0f}"
    except Exception:
        return "—"

def num(x: Any, unit: str = "", decimals: int = 0) -> str:
    try:
        v = float(x)
        fmt = f"{{:.{decimals}f}}"
        s = fmt.format(v)
        return f"{s}{(' ' + unit) if unit else ''}"
    except Exception:
        return "—"

def years_text(x: Any) -> str:
    if x is None:
        return "—"
    try:
        v = float(x)
        if v != v or v == float("inf"):
            return "No Payback"
        if v > 99:
            return ">99"
        if abs(v - round(v)) < 1e-9:
            return f"{int(round(v))}"
        return f"{v:.1f}"
    except Exception:
        return "—"

def safe_float(x: Any) -> Optional[float]:
    try:
        return float(x)
    except Exception:
        return None

def safe_get(d: Dict[str, Any], path: List[str], default: Any = None) -> Any:
    cur: Any = d
    for p in path:
        if not isinstance(cur, dict) or p not in cur:
            return default
        cur = cur[p]
    return cur

def verdict_accent(verdict_text: str) -> Color:
    """Fix: 'unlikely' contains 'likely', so check it first."""
    t = (verdict_text or "").lower()
    if "unlikely" in t:
        return COLOR_RED
    if "borderline" in t:
        return COLOR_AMBER
    if "likely" in t:
        return COLOR_GREEN
    return COLOR_PRIMARY


# --- casing helpers that handle punctuation properly ---
_WORD_RE = re.compile(r"^(\W*)([A-Za-z0-9/]+)(\W*)$")

def title_case_keep_acronyms(s: str) -> str:
    if not s:
        return s
    words = s.replace("_", " ").split()
    out: List[str] = []
    acr = {a.upper() for a in ACRONYMS}
    for w in words:
        m = _WORD_RE.match(w)
        if not m:
            out.append(w)
            continue
        pre, core, post = m.groups()
        if core.upper() in acr:
            out.append(pre + core.upper() + post)
        else:
            out.append(pre + core[:1].upper() + core[1:].lower() + post)
    return " ".join(out)

def sentence_case_keep_acronyms(s: str) -> str:
    s = (s or "").strip()
    if not s:
        return s
    s = s[:1].upper() + s[1:]

    # Replace acronyms only on word boundaries so "number" never becomes "numBER"
    for a in sorted({a for a in ACRONYMS}, key=len, reverse=True):
        pattern = re.compile(rf"\b{re.escape(a)}\b", flags=re.IGNORECASE)
        s = pattern.sub(a.upper(), s)

    return s


# =========================
# Text wrapping
# =========================
def _wrap_lines(text: str, font_name: str, font_size: float, max_width: float) -> List[str]:
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

def draw_wrapped(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    max_width: float,
    font: str = "Helvetica",
    size: float = 10,
    leading: float = 13,
    color: Color = COLOR_TEXT,
    sentence_case: bool = True,
) -> float:
    t = sentence_case_keep_acronyms(text) if sentence_case else text
    c.setFillColor(color)
    c.setFont(font, size)
    for line in _wrap_lines(t, font, size, max_width):
        c.drawString(x, y, line)
        y -= leading
    return y

def draw_bullets(
    c: canvas.Canvas,
    x: float,
    y: float,
    bullets: List[str],
    max_width: float,
    font: str = "Helvetica",
    size: float = 10,
    leading: float = 13,
    bullet_indent: float = 4 * mm,
    color: Color = COLOR_TEXT,
) -> float:
    c.setFillColor(color)
    c.setFont(font, size)
    for b in bullets or []:
        btxt = sentence_case_keep_acronyms(str(b))
        wrapped = _wrap_lines(btxt, font, size, max_width - bullet_indent - 2 * mm)
        if not wrapped:
            continue
        c.drawString(x, y, "•")
        c.drawString(x + bullet_indent, y, wrapped[0])
        y -= leading
        for line in wrapped[1:]:
            c.drawString(x + bullet_indent, y, line)
            y -= leading
    return y


# =========================
# Logo + header/footer
# =========================
def draw_clearheat_logo(
    c: canvas.Canvas,
    x: float,
    y: float,
    size: float,
    stroke: Color = COLOR_PRIMARY,
    stroke_width: float = 2.0,
) -> None:
    """(x,y) is top-left of the logo box."""
    c.saveState()
    c.setStrokeColor(stroke)
    c.setLineWidth(stroke_width)
    c.setLineJoin(1)
    c.setLineCap(1)

    s = size / 40.0
    ox, oy = x, y

    def sx(v: float) -> float:
        return ox + v * s

    def sy(v: float) -> float:
        return oy - v * s

    # roof
    c.line(sx(8), sy(18), sx(20), sy(8))
    c.line(sx(20), sy(8), sx(32), sy(18))
    # body
    c.line(sx(12), sy(18), sx(12), sy(32))
    c.line(sx(12), sy(32), sx(28), sy(32))
    c.line(sx(28), sy(32), sx(28), sy(18))
    # heat waves
    for x0 in (16, 20, 24):
        p = c.beginPath()
        p.moveTo(sx(x0), sy(28))
        p.curveTo(sx(x0 - 2), sy(26), sx(x0 - 2), sy(24), sx(x0), sy(22))
        p.curveTo(sx(x0 + 2), sy(20), sx(x0 + 2), sy(18), sx(x0), sy(16))
        c.drawPath(p, stroke=1, fill=0)

    c.restoreState()

def draw_wordmark(c: canvas.Canvas, x: float, y: float, size: int = 14) -> float:
    from reportlab.pdfbase.pdfmetrics import stringWidth
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica", size)
    c.drawString(x, y, "Clear")
    w_clear = stringWidth("Clear", "Helvetica", size)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x + w_clear, y, "Heat")
    w_heat = stringWidth("Heat", "Helvetica-Bold", size)
    return x + w_clear + w_heat

def header_footer(
    c: canvas.Canvas,
    page_num: int,
    total_pages: int,
    W: float,
    H: float,
    margin: float,
    subtitle: str,
) -> None:
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.line(margin, H - margin + 4 * mm, W - margin, H - margin + 4 * mm)

    logo_size = 9 * mm
    baseline_y = H - margin + 7.5 * mm
    cap_offset = 11 * 0.123 * mm
    draw_clearheat_logo(c, margin, baseline_y + (logo_size / 2) + cap_offset, size=logo_size, stroke_width=1.4)
    draw_wordmark(c, margin + logo_size + 3.5 * mm, baseline_y, size=11)

    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 9)
    c.drawRightString(W - margin, baseline_y, title_case_keep_acronyms(subtitle))

    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.line(margin, margin - 6 * mm, W - margin, margin - 6 * mm)

    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(margin, margin - 10 * mm, "Independent screening estimate — not affiliated with installers or manufacturers.")
    c.drawRightString(W - margin, margin - 10 * mm, f"Page {page_num} of {total_pages}")


# =========================
# Layout primitives
# =========================
def panel(c: canvas.Canvas, x: float, y_top: float, w: float, h: float) -> None:
    c.setFillColor(COLOR_PANEL)
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y_top - h, w, h, radius=3 * mm, stroke=1, fill=1)


def draw_left_accent_bar(
    c: canvas.Canvas, x: float, y_top: float, bar_w: float, bar_h: float,
    color: Color, radius: float = 3 * mm
) -> None:
    """Solid bar with rounded corners on the LEFT side only, square on the right."""
    r = min(radius, bar_w / 2, bar_h / 2)
    bx, by = x, y_top - bar_h   # bottom-left corner
    p = c.beginPath()
    # Start at top-right (square)
    p.moveTo(bx + bar_w, y_top)
    # Top edge → top-left (rounded)
    p.lineTo(bx + r, y_top)
    p.curveTo(bx, y_top, bx, y_top, bx, y_top - r)
    # Left edge down → bottom-left (rounded)
    p.lineTo(bx, by + r)
    p.curveTo(bx, by, bx, by, bx + r, by)
    # Bottom edge → bottom-right (square)
    p.lineTo(bx + bar_w, by)
    p.close()
    c.setFillColor(color)
    c.drawPath(p, stroke=0, fill=1)


def section_title(c: canvas.Canvas, x: float, y: float, title: str) -> float:
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y, title_case_keep_acronyms(title))
    return y - 7 * mm

def kv_row(c: canvas.Canvas, x: float, y: float, label: str, value: str, w: float) -> float:
    c.setFont("Helvetica", 10)
    c.setFillColor(COLOR_MUTED)
    c.drawString(x, y, title_case_keep_acronyms(label))

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(COLOR_TEXT)
    c.drawRightString(x + w, y, value)
    return y - 6.5 * mm


# =========================
# Tables
# =========================

def affordable_capex_table(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    w: float,
    affordable: Dict[str, Any],
    grant_applied: bool,
    grant_value_eur: float,
    market_verdict: str,
    typical_irish_range: List[int],
    annual_savings: float,
) -> float:
    """
    Homeowner-friendly table: rows = scenarios, columns = payback horizons.
    Shows the max you could spend (after grant) and still break even in that time.
    """
    horizons     = ["8yr",      "10yr",      "12yr",      "15yr"]
    hz_labels    = ["8 yrs",   "10 yrs",    "12 yrs",    "15 yrs"]
    scenarios    = [("best", "Best case"), ("typical", "Typical"), ("worst", "Worst case")]

    pad      = 4 * mm
    row_h    = 8.5 * mm
    hdr_h    = 9 * mm
    intro_h  = 14 * mm   # space for explanatory text above the table
    footer_h = 22 * mm   # enough for two context lines + market verdict line
    h = intro_h + hdr_h + row_h * len(scenarios) + footer_h

    panel(c, x, y_top, w, h)

    # ---- Title ----
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(x + pad, y_top - pad - 1.5 * mm, "What Could You Afford to Spend on a Heat Pump?")

    # ---- Explanatory intro ----
    grant_phrase = f"after the €{int(grant_value_eur):,} SEAI grant" if grant_applied else "with no grant applied"
    intro = (
        f"Based on ~{eur(annual_savings)}/yr estimated savings, the table shows the maximum you could "
        f"spend ({grant_phrase}) and still break even within each timeframe."
    )
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8.5)
    intro_lines = _wrap_lines(intro, "Helvetica", 8.5, w - 2 * pad)
    iy = y_top - pad - 5 * mm
    for ln in intro_lines[:2]:
        c.drawString(x + pad, iy, ln)
        iy -= 4 * mm

    # ---- Table ----
    tx = x + pad
    tw = w - 2 * pad
    ty = y_top - intro_h - hdr_h  # top of first data row (header row is above this)

    label_w  = 0.24 * tw
    hz_w     = (tw - label_w) / len(horizons)
    cols     = [label_w] + [hz_w] * len(horizons)

    def col_left(ci: int) -> float:
        return tx + sum(cols[:ci])

    def col_right(ci: int) -> float:
        return tx + sum(cols[:ci + 1])

    def row_top(ri: int) -> float:
        """Top y of data row ri (0=first data row, not header)."""
        return ty - ri * row_h

    # Header background
    c.setFillColor(COLOR_LINE)
    c.rect(tx, ty, tw, hdr_h, stroke=0, fill=1)

    # Outer border (header + data rows)
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.rect(tx, ty - len(scenarios) * row_h, tw, hdr_h + len(scenarios) * row_h, stroke=1, fill=0)

    # Vertical column dividers
    for ci in range(1, len(cols)):
        lx = col_left(ci)
        c.line(lx, ty - len(scenarios) * row_h, lx, ty + hdr_h)

    # Horizontal row dividers (between data rows only)
    for ri in range(1, len(scenarios)):
        ry = row_top(ri)
        c.line(tx, ry, tx + tw, ry)

    def draw_cell(ci: int, ri_top: float, ri_h: float, text: str,
                  bold: bool = False, color: Color = COLOR_TEXT,
                  right: bool = False, bg: Optional[Color] = None) -> None:
        if bg:
            c.setFillColor(bg)
            c.rect(col_left(ci), ri_top - ri_h, cols[ci], ri_h, stroke=0, fill=1)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9.2)
        cy = ri_top - ri_h / 2 - 1.5 * mm
        if right:
            c.drawRightString(col_right(ci) - 2 * mm, cy, text)
        else:
            c.drawString(col_left(ci) + 2 * mm, cy, text)

    # Header row
    draw_cell(0, ty + hdr_h, hdr_h, "Scenario", bold=True, color=COLOR_PRIMARY)
    for ci, lbl in enumerate(hz_labels, start=1):
        draw_cell(ci, ty + hdr_h, hdr_h, lbl, bold=True, color=COLOR_TEXT, right=True)

    # Data rows
    for ri, (sc_key, sc_label) in enumerate(scenarios):
        rt = row_top(ri)
        is_typical = (sc_key == "typical")
        row_bg = HexColor("#F0F7F0") if is_typical else None
        draw_cell(0, rt, row_h, sc_label, bold=is_typical,
                  color=COLOR_PRIMARY if is_typical else COLOR_MUTED, bg=row_bg)
        for ci, hz_key in enumerate(horizons, start=1):
            sc_data = affordable.get(hz_key, {}).get(sc_key, {})
            net = sc_data.get("affordable_net_eur")
            val_txt = eur(net) if (net is not None and net > 0) else "Covered by grant"
            is_highlight = is_typical and hz_key == "12yr"
            draw_cell(ci, rt, row_h, val_txt, bold=is_highlight, right=True,
                      color=COLOR_PRIMARY if is_highlight else COLOR_TEXT,
                      bg=HexColor("#D4EDD4") if is_highlight else row_bg)

    # ---- Footer context ----
    bench_low, bench_high = (typical_irish_range[0], typical_irish_range[1]) if typical_irish_range else (12000, 18000)
    net_low  = max(0, bench_low  - int(grant_value_eur)) if grant_applied else bench_low
    net_high = max(0, bench_high - int(grant_value_eur)) if grant_applied else bench_high

    fy = ty - len(scenarios) * row_h - 3 * mm
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8)
    if grant_applied:
        c.drawString(tx, fy,
            f"Typical Irish installation: €{bench_low//1000}k–€{bench_high//1000}k gross / "
            f"€{net_low//1000}k–€{net_high//1000}k net after the €{int(grant_value_eur):,} SEAI grant.")
    else:
        c.drawString(tx, fy,
            f"Typical Irish installation: €{bench_low//1000}k–€{bench_high//1000}k gross (no grant applied).")
    fy -= 5 * mm

    # ---- Market verdict coloured summary line ----
    verdict_color = {
        "viable":       COLOR_GREEN,
        "borderline":   COLOR_AMBER,
        "below_market": COLOR_RED,
    }.get(market_verdict, COLOR_MUTED)
    verdict_msgs = {
        "viable":
            "Good news: your estimated savings are large enough to justify a typical Irish installation within 12 years.",
        "borderline":
            "Borderline: savings could justify a smaller installation, but the result is sensitive to energy prices and system design.",
        "below_market":
            "Caution: at current prices, savings may not justify a typical Irish installation. Improving insulation first can help.",
    }
    c.setFillColor(verdict_color)
    c.setFont("Helvetica-Bold", 8.5)
    verdict_lines = _wrap_lines(verdict_msgs.get(market_verdict, ""), "Helvetica-Bold", 8.5, tw)
    for ln in verdict_lines[:2]:
        c.drawString(tx, fy, ln)
        fy -= 5 * mm

    return y_top - h - 4 * mm


def scenario_compare_table(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    w: float,
    best: Dict[str, Any],
    typ: Dict[str, Any],
    worst: Dict[str, Any],
) -> float:
    row_h = 9 * mm
    pad = 4 * mm
    h = row_h * 3 + 16 * mm

    panel(c, x, y_top, w, h)

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(x + pad, y_top - pad - 1.5 * mm, "Scenario Comparison (Key Outputs)")

    tx = x + pad
    ty = y_top - 16 * mm
    tw = w - 2 * pad

    cols = [0.34 * tw, 0.22 * tw, 0.22 * tw, 0.22 * tw]
    headers = ["", "Best", "Typical", "Worst"]

    c.setFillColor(COLOR_LINE)
    c.rect(tx, ty, tw, row_h, stroke=0, fill=1)

    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.rect(tx, ty - 2 * row_h, tw, 3 * row_h, stroke=1, fill=0)

    xx = tx
    for wc in cols[:-1]:
        xx += wc
        c.line(xx, ty - 2 * row_h, xx, ty + row_h)

    c.line(tx, ty, tx + tw, ty)
    c.line(tx, ty - row_h, tx + tw, ty - row_h)
    c.line(tx, ty - 2 * row_h, tx + tw, ty - 2 * row_h)

    def cell(col_i: int, row_i: int, text: str, bold: bool = False, color: Color = COLOR_TEXT, right: bool = False):
        c.setFillColor(color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9.8)
        cx_left = tx + sum(cols[:col_i]) + 2.5 * mm
        cx_right = tx + sum(cols[:col_i + 1]) - 2.5 * mm
        cy = ty + (row_h - 6.0 * mm) - row_i * row_h + 2.2 * mm
        if right:
            c.drawRightString(cx_right, cy, text)
        else:
            c.drawString(cx_left, cy, text)

    for i, htxt in enumerate(headers):
        cell(i, 0, htxt, bold=True, color=COLOR_PRIMARY if i == 0 else COLOR_TEXT)

    cell(0, 1, "Annual savings (€/yr)", bold=True, color=COLOR_MUTED)
    cell(1, 1, eur(best.get("savings_eur")), right=True)
    cell(2, 1, eur(typ.get("savings_eur")), right=True)
    cell(3, 1, eur(worst.get("savings_eur")), right=True)

    cell(0, 2, "Simple payback (years)", bold=True, color=COLOR_MUTED)
    cell(1, 2, years_text(best.get("payback_years")), right=True)
    cell(2, 2, years_text(typ.get("payback_years")), right=True)
    cell(3, 2, years_text(worst.get("payback_years")), right=True)

    return y_top - h - 6 * mm


# =========================
# Cumulative savings graph
# =========================
def build_cumulative_series(capex: float, annual_savings: float, years: int, elec_uplift: float) -> List[float]:
    adj = annual_savings * (1.0 - elec_uplift)
    series = [0.0]
    cum = 0.0
    for _ in range(1, years + 1):
        cum += adj
        series.append(cum)
    return series

def find_break_even_year(capex: float, cumulative: List[float]) -> Optional[int]:
    for year, v in enumerate(cumulative):
        if year == 0:
            continue
        if v >= capex:
            return year
    return None

def draw_cumulative_graph(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    w: float,
    h: float,
    title: str,
    capex: float,
    series_base: List[float],
    series_5: List[float],
    series_10: List[float],
    series_15: List[float],
    capex_label: Optional[str] = None,
) -> None:
    panel(c, x, y_top, w, h)
    pad = 6 * mm

    # Title
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10.8)
    c.drawString(x + pad, y_top - pad - 1.5 * mm, title_case_keep_acronyms(title))

    # Chart area
    cx0 = x + pad
    cx1 = x + w - pad

    # Reserve top safe zone for legend so it never blocks data
    legend_safe_h = 22 * mm

    cy0 = y_top - h + 14 * mm
    cy1 = y_top - 18 * mm - legend_safe_h  # top of chart lowered

    years = min(len(series_base), len(series_5), len(series_10), len(series_15)) - 1

    all_vals = series_base + series_5 + series_10 + series_15 + [capex]
    vmin = min(all_vals)
    vmax = max(all_vals)
    if abs(vmax - vmin) < 1e-9:
        vmax = vmin + 1.0

    def x_for_year(t: int) -> float:
        return cx0 + (cx1 - cx0) * (t / max(1, years))

    def y_for_val(v: float) -> float:
        return cy0 + (cy1 - cy0) * ((v - vmin) / (vmax - vmin))

    # Axes
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(1.0)
    c.line(cx0, cy0, cx0, cy1)
    c.line(cx0, cy0, cx1, cy0)

    # Y grid/ticks
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8.5)
    for frac in [0.0, 0.5, 1.0]:
        v = vmin + frac * (vmax - vmin)
        yy = y_for_val(v)
        c.setStrokeColor(COLOR_LINE)
        c.setLineWidth(0.8)
        c.line(cx0, yy, cx1, yy)
        c.drawString(cx0, yy + 1.5 * mm, eur(v))

    # X ticks: every 2 years from 0 to 20 (or to years if <20)
    max_tick = min(years, 20)
    tick_years = list(range(0, max_tick + 1, 2))
    if tick_years and tick_years[-1] != max_tick:
        tick_years.append(max_tick)

    for t in tick_years:
        xx = x_for_year(t)
        c.setStrokeColor(COLOR_LINE)
        c.setLineWidth(0.8)
        c.line(xx, cy0, xx, cy0 - 2 * mm)
        c.setFillColor(COLOR_MUTED)
        c.setFont("Helvetica", 8.5)
        c.drawCentredString(xx, cy0 - 6 * mm, f"Year {t}")

    # Capex line
    cap_y = y_for_val(capex)
    c.setStrokeColor(COLOR_PRIMARY)
    c.setLineWidth(1.4)
    c.line(cx0, cap_y, cx1, cap_y)
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 8.8)
    cap_line_label = capex_label if capex_label else f"Capex: {eur(capex)}"
    if not capex_label:
        cap_line_label = f"Capex: {eur(capex)}"
    else:
        cap_line_label = f"{capex_label}: {eur(capex)}"
    c.drawRightString(cx1, cap_y + 2.0 * mm, cap_line_label)

    # Series drawer
    def draw_series(vals: List[float], dash: Optional[Tuple[int, int]]):
        if dash:
            c.setDash(dash[0], dash[1])
        else:
            c.setDash()
        c.setStrokeColor(COLOR_TEXT)
        c.setLineWidth(1.2)

        p = c.beginPath()
        p.moveTo(x_for_year(0), y_for_val(vals[0]))
        for t in range(1, years + 1):
            p.lineTo(x_for_year(t), y_for_val(vals[t]))
        c.drawPath(p, stroke=1, fill=0)
        c.setDash()

    draw_series(series_base, None)
    draw_series(series_5, (3, 2))
    draw_series(series_10, (1, 2))
    draw_series(series_15, (6, 2))

    # Break-even drop line for BASE series
    be_year = find_break_even_year(capex, series_base)
    if be_year is not None:
        be_x = x_for_year(be_year)

        c.setStrokeColor(COLOR_MUTED)
        c.setLineWidth(0.9)
        c.setDash(2, 2)
        c.line(be_x, cap_y, be_x, cy0)
        c.setDash()

        c.setFillColor(COLOR_MUTED)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(be_x, cy0 + 2.5 * mm, f"Break-even: Year {be_year}")

    # Legend overlay box — auto sized so it never overflows
    legend_items = [
        ("Base electricity price", None),
        ("+5% electricity price", (3, 2)),
        ("+10% electricity price", (1, 2)),
        ("+15% electricity price", (6, 2)),
    ]

    line_h = 4.3 * mm
    box_pad_x = 3.5 * mm
    box_pad_y = 3.0 * mm
    box_h = box_pad_y * 2 + line_h * len(legend_items)
    box_w = 70 * mm

    box_x = cx0
    box_y_top = y_top - 18 * mm  # inside the safe zone

    c.saveState()
    try:
        c.setFillAlpha(0.88)
        c.setStrokeAlpha(0.88)
    except Exception:
        pass

    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.roundRect(box_x, box_y_top - box_h, box_w, box_h, radius=2 * mm, stroke=1, fill=1)

    c.setFont("Helvetica", 8.6)
    y_row = box_y_top - box_pad_y - 0.8 * mm
    for label, dash in legend_items:
        sx0 = box_x + box_pad_x
        sx1 = sx0 + 14 * mm
        sy = y_row

        c.setStrokeColor(COLOR_TEXT)
        c.setLineWidth(1.2)
        if dash:
            c.setDash(dash[0], dash[1])
        else:
            c.setDash()
        c.line(sx0, sy, sx1, sy)
        c.setDash()

        c.setFillColor(COLOR_TEXT)
        c.drawString(sx1 + 3 * mm, y_row - 3.0 * mm, sentence_case_keep_acronyms(label))
        y_row -= line_h

    c.restoreState()


# =========================
# Glossary + Method/Disclaimer text
# =========================
GLOSSARY = [
    ("SCOP", "Seasonal coefficient of performance. A year-round efficiency number. Higher SCOP means less electricity per unit of heat delivered."),
    ("NPV", "Net present value. The value today of future savings after discounting. Positive NPV suggests the investment is attractive under the assumptions."),
    ("Simple payback", "Net upfront cost divided by annual savings. Ignores financing and the time value of money."),
    ("Break-even year", "The first year where cumulative savings exceed the net upfront cost."),
    ("Best / Typical / Worst", "A sensitivity band showing optimistic, central, and pessimistic assumptions to reflect real-world uncertainty."),
    ("Flow temperature", "The water temperature sent to your radiators or UFH. Lower flow temperatures usually improve heat pump efficiency."),
    ("Emitters", "Your heat delivery system (radiators or underfloor heating). Radiators often require higher flow temperatures than UFH."),
]

def methodology_text() -> List[str]:
    return [
        "This is a screening-level assessment designed to help you decide whether a heat pump is likely to save money before committing to major spend.",
        "If you provide bills, the model anchors demand to your reported annual fuel spend or usage (preferred). Otherwise, it uses a BER-based demand estimate with an uncertainty band.",
        "Heat pump running cost is estimated using a seasonal efficiency range (SCOP) based on your emitter type (radiators vs underfloor heating).",
        "Results are shown as best, typical, and worst cases to reflect uncertainty in home heat demand, system design, commissioning quality, and energy pricing.",
        "The scenario graphs show cumulative savings over time versus the net upfront cost. Electricity price stress lines (+5%, +10%, +15%) show how sensitive the outcome is to electricity price increases.",
    ]

def disclaimer_text() -> List[str]:
    return [
        "This report is for informational purposes only and does not constitute engineering design advice.",
        "Actual performance and costs may differ due to system sizing, installation quality, emitter suitability, controls, house condition, occupant behaviour, weather variation, and energy price changes.",
        "You should obtain a detailed heat loss calculation and competent system design before committing to major spend.",
    ]


# =========================
# Extraction helpers
# =========================
def get_primary_method(report: Dict[str, Any]) -> str:
    return str(safe_get(report, ["decision", "primary_method"], "ber_based"))

def method_block(report: Dict[str, Any], method: str) -> Dict[str, Any]:
    blk = safe_get(report, ["results", method], {}) or {}
    return blk if isinstance(blk, dict) else {}

def scenario_triplet(report: Dict[str, Any], method: str) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    blk = method_block(report, method)
    return (blk.get("best", {}) or {}, blk.get("typical", {}) or {}, blk.get("worst", {}) or {})


# =========================
# Bottom-line callout box
# =========================
def draw_bottom_line_callout(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    w: float,
    text: str,
    accent: Color,
) -> float:
    """A prominent single-sentence callout — the most important number in the report."""
    h = 18 * mm
    # Solid coloured background
    c.setFillColor(HexColor("#EEF5EE") if accent == COLOR_GREEN
                   else HexColor("#FFF8EE") if accent == COLOR_AMBER
                   else HexColor("#FEEEEE"))
    c.setStrokeColor(accent)
    c.setLineWidth(1.4)
    c.roundRect(x, y_top - h, w, h, radius=3 * mm, stroke=1, fill=1)
    # Left colour bar (rounded left side only)
    draw_left_accent_bar(c, x, y_top, 5 * mm, h, accent)

    c.setFillColor(COLOR_TEXT)
    c.setFont("Helvetica-Bold", 10.2)
    lines = _wrap_lines(text, "Helvetica-Bold", 10.2, w - 14 * mm)
    leading_mm = 6.0 * mm
    n = len(lines[:2])
    # Centre the text block vertically: baseline of first line
    text_y = y_top - (h - (n - 1) * leading_mm) / 2
    for ln in lines[:2]:
        c.drawString(x + 8 * mm, text_y, ln)
        text_y -= leading_mm
    return y_top - h - 4 * mm


# =========================
# Verdict panel (redesigned)
# =========================
def draw_verdict_panel(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    w: float,
    verdict_text: str,
    confidence_basis: str,
    what_this_means: List[str],
    accent: Color,
) -> float:
    """Redesigned verdict panel: large verdict, plain-English reliability label, bullets."""
    bullet_h = sum(
        len(_wrap_lines(b, "Helvetica", 9.5, w - 22 * mm)) * 5.2 * mm
        for b in what_this_means[:2]
    )
    h = 40 * mm + bullet_h

    panel(c, x, y_top, w, h)
    # Left accent bar (rounded left side only)
    draw_left_accent_bar(c, x, y_top, 5 * mm, h, accent)

    inner_x = x + 9 * mm
    avail_w = w - 13 * mm

    # "Our assessment"
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(inner_x, y_top - 8 * mm, "Our assessment")

    # Verdict text (large)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(inner_x, y_top - 17 * mm, verdict_text)

    # Thin separator line
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.6)
    c.line(inner_x, y_top - 21 * mm, x + w - 6 * mm, y_top - 21 * mm)

    # Reliability label
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(inner_x, y_top - 26 * mm, "Reliability:  ")
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(COLOR_TEXT)
    rel_lines = _wrap_lines(confidence_basis, "Helvetica-Bold", 8.5, avail_w - 22 * mm)
    from reportlab.pdfbase.pdfmetrics import stringWidth
    label_w = stringWidth("Reliability:  ", "Helvetica", 8.5)
    c.drawString(inner_x + label_w, y_top - 26 * mm, rel_lines[0] if rel_lines else "")
    vy = y_top - 32 * mm

    # What this means bullets
    for bullet in what_this_means[:2]:
        c.setFillColor(COLOR_TEXT)
        c.setFont("Helvetica", 9.2)
        blines = _wrap_lines(bullet, "Helvetica", 9.2, avail_w - 5 * mm)
        c.drawString(inner_x, vy, "•")
        for ln in blines[:3]:
            c.drawString(inner_x + 4 * mm, vy, ln)
            vy -= 5.2 * mm

    return y_top - h - 4 * mm


# =========================
# Scenario graph: no-quote version (shows savings against Irish market range)
# =========================
def draw_savings_projection_graph(
    c: canvas.Canvas,
    x: float,
    y_top: float,
    w: float,
    h: float,
    annual_savings: float,
    typical_irish_net_low: float,
    typical_irish_net_high: float,
    elec_uplift_levels: List[float],
) -> None:
    """
    For the no-quote case: shows cumulative savings over 20 years as lines,
    with a shaded band for the typical Irish net cost range, so the homeowner
    can see where savings would cross a realistic installation cost.
    """
    from reportlab.pdfbase.pdfmetrics import stringWidth

    panel(c, x, y_top, w, h)
    pad = 6 * mm

    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 10.8)
    c.drawString(x + pad, y_top - pad - 1.5 * mm, "How quickly could your savings add up?")

    cx0 = x + pad
    cx1 = x + w - pad
    legend_safe_h = 22 * mm
    cy0 = y_top - h + 14 * mm
    cy1 = y_top - 18 * mm - legend_safe_h

    years = 20
    all_series: List[List[float]] = []
    for uplift in elec_uplift_levels:
        series = [0.0]
        cum = 0.0
        for _ in range(1, years + 1):
            cum += annual_savings * (1.0 - uplift)
            series.append(cum)
        all_series.append(series)

    all_vals = [v for s in all_series for v in s] + [typical_irish_net_low, typical_irish_net_high]
    vmin = 0.0
    vmax = max(all_vals) * 1.05
    if abs(vmax - vmin) < 1e-9:
        vmax = 1.0

    def x_for_year(t: int) -> float:
        return cx0 + (cx1 - cx0) * (t / years)

    def y_for_val(v: float) -> float:
        return cy0 + (cy1 - cy0) * ((v - vmin) / (vmax - vmin))

    # Axes
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(1.0)
    c.line(cx0, cy0, cx0, cy1)
    c.line(cx0, cy0, cx1, cy0)

    # Y grid
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 8.5)
    for frac in [0.0, 0.25, 0.5, 0.75, 1.0]:
        v = vmin + frac * (vmax - vmin)
        yy = y_for_val(v)
        c.setStrokeColor(COLOR_LINE)
        c.setLineWidth(0.6)
        c.line(cx0, yy, cx1, yy)
        if frac in [0.0, 0.5, 1.0]:
            c.drawString(cx0, yy + 1.5 * mm, eur(v))

    # X ticks
    for t in range(0, years + 1, 2):
        xx = x_for_year(t)
        c.setStrokeColor(COLOR_LINE)
        c.setLineWidth(0.6)
        c.line(xx, cy0, xx, cy0 - 2 * mm)
        c.setFillColor(COLOR_MUTED)
        c.setFont("Helvetica", 8.5)
        c.drawCentredString(xx, cy0 - 6 * mm, f"Yr {t}")

    # Shaded band for typical Irish net cost range
    band_y_low = y_for_val(typical_irish_net_low)
    band_y_high = y_for_val(typical_irish_net_high)
    if band_y_high > cy0 and band_y_low < cy1:
        band_y_low = max(band_y_low, cy0)
        band_y_high = min(band_y_high, cy1)
        c.saveState()
        try:
            c.setFillAlpha(0.12)
        except Exception:
            pass
        c.setFillColor(COLOR_PRIMARY)
        c.rect(cx0, band_y_low, cx1 - cx0, band_y_high - band_y_low, stroke=0, fill=1)
        c.restoreState()
        # Band label
        c.setFillColor(COLOR_PRIMARY)
        c.setFont("Helvetica-Bold", 8)
        label_txt = f"Typical Irish cost range: {eur(typical_irish_net_low)}–{eur(typical_irish_net_high)} (after grant)"
        c.drawRightString(cx1, band_y_high + 1.5 * mm, label_txt)

    # Draw savings lines
    dashes = [None, (3, 2), (1, 2), (6, 2)]
    colors = [COLOR_GREEN, HexColor("#1565C0"), HexColor("#558B2F"), HexColor("#6A1B9A")]
    for i, (series, dash) in enumerate(zip(all_series, dashes)):
        c.setStrokeColor(colors[i] if i < len(colors) else COLOR_TEXT)
        c.setLineWidth(1.4 if i == 0 else 1.0)
        if dash:
            c.setDash(dash[0], dash[1])
        else:
            c.setDash()
        p = c.beginPath()
        p.moveTo(x_for_year(0), y_for_val(series[0]))
        for t in range(1, years + 1):
            p.lineTo(x_for_year(t), y_for_val(series[t]))
        c.drawPath(p, stroke=1, fill=0)
        c.setDash()

    # Legend
    legend_items = [
        ("Base electricity price", None, COLOR_GREEN),
        ("+5% electricity price", (3, 2), HexColor("#1565C0")),
        ("+10% electricity price", (1, 2), HexColor("#558B2F")),
        ("+15% electricity price", (6, 2), HexColor("#6A1B9A")),
    ]
    line_h = 4.3 * mm
    box_pad_x = 3.5 * mm
    box_pad_y = 3.0 * mm
    box_h = box_pad_y * 2 + line_h * len(legend_items)
    box_w = 72 * mm
    box_x = cx0
    box_y_top = y_top - 18 * mm

    c.saveState()
    try:
        c.setFillAlpha(0.92)
        c.setStrokeAlpha(0.92)
    except Exception:
        pass
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(0.8)
    c.roundRect(box_x, box_y_top - box_h, box_w, box_h, radius=2 * mm, stroke=1, fill=1)
    y_row = box_y_top - box_pad_y - 0.8 * mm
    for label, dash, lcolor in legend_items:
        sx0 = box_x + box_pad_x
        sx1 = sx0 + 14 * mm
        c.setStrokeColor(lcolor)
        c.setLineWidth(1.4 if dash is None else 1.0)
        if dash:
            c.setDash(dash[0], dash[1])
        else:
            c.setDash()
        c.line(sx0, y_row, sx1, y_row)
        c.setDash()
        c.setFillColor(COLOR_TEXT)
        c.setFont("Helvetica", 8.6)
        c.drawString(sx1 + 3 * mm, y_row - 3.0 * mm, label)
        y_row -= line_h
    c.restoreState()


# =========================
# Public API
# =========================
def build_pdf(report: Dict[str, Any]) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    margin = 16 * mm
    x0 = margin
    usable_w = W - 2 * margin

    meta = report.get("meta", {}) or {}
    inp = report.get("inputs", {}) or {}
    dec = report.get("decision", {}) or {}
    cross = report.get("cross_check", {}) or {}

    report_id = str(
        meta.get("report_id")
        or meta.get("id")
        or meta.get("session_id")
        or "CH-" + str(meta.get("generated_at_utc", "")).replace(":", "").replace("-", "").replace("T", "")[:12]
    )
    gen_date = str(meta.get("generated_at_utc", "—"))[:10]  # date only

    verdict_text_raw = dec.get("verdict_text") or str(dec.get("verdict", "—")).replace("_", " ")
    verdict_text = title_case_keep_acronyms(verdict_text_raw)

    confidence_basis = str(dec.get("confidence_basis", ""))
    if not confidence_basis:
        # Fallback for older engine versions
        conf_level = str(dec.get("confidence_level", "medium"))
        primary_method = get_primary_method(report)
        if primary_method == "bills_based":
            confidence_basis = "Anchored to your fuel bills — high reliability" if conf_level == "high" else "Anchored to your fuel bills — some uncertainty remains"
        else:
            confidence_basis = "BER estimate only — add your annual fuel spend for a sharper result"

    accent = verdict_accent(verdict_text)

    primary_method = get_primary_method(report)
    best, typ, worst = scenario_triplet(report, primary_method)

    capex = safe_float(inp.get("hp_capex_eur"))  # May be None if no quote

    quote_provided = bool(dec.get("quote_provided", capex is not None))
    ref_capex = safe_float(dec.get("ref_capex_eur")) or 0.0
    capex_label = dec.get("ref_capex_label")

    affordable = dec.get("affordable_capex") or {}
    market_verdict = str(dec.get("market_verdict", ""))
    typical_irish_range = list(dec.get("typical_irish_gross_range") or dec.get("typical_irish_range") or [12000, 18000])

    personalised = dec.get("personalised")

    grant_applied = bool(inp.get("grant_applied", True))
    grant_value_eur = safe_float(inp.get("grant_value_eur")) or 0.0

    what_this_means_bullets = dec.get("what_this_means") or []
    typ_savings = safe_float(dec.get("typical_savings_eur")) or 0.0

    # Irish market NET cost range (after grant)
    bench_low  = typical_irish_range[0] if len(typical_irish_range) > 0 else 12000
    bench_high = typical_irish_range[1] if len(typical_irish_range) > 1 else 18000
    net_low  = max(0, bench_low  - int(grant_value_eur)) if grant_applied else bench_low
    net_high = max(0, bench_high - int(grant_value_eur)) if grant_applied else bench_high

    total_pages = 7

    # ===========================================================
    # Page 1 — Cover
    # ===========================================================
    header_footer(c, 1, total_pages, W, H, margin, subtitle="Cover Page")
    from reportlab.pdfbase.pdfmetrics import stringWidth

    center_x = W / 2

    # Logo + wordmark centred
    logo_size = 38 * mm
    logo_y_top = H / 2 + 60 * mm
    draw_clearheat_logo(c, center_x - logo_size / 2, logo_y_top, size=logo_size, stroke_width=2.6)

    w_clear = stringWidth("Clear", "Helvetica", 28)
    w_heat  = stringWidth("Heat",  "Helvetica-Bold", 28)
    word_w  = w_clear + w_heat
    y_word  = logo_y_top - logo_size - 5 * mm
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica", 28)
    c.drawString(center_x - word_w / 2, y_word, "Clear")
    c.setFont("Helvetica-Bold", 28)
    c.drawString(center_x - word_w / 2 + w_clear, y_word, "Heat")

    # Report title
    y = y_word - 14 * mm
    c.setFillColor(COLOR_TEXT)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(center_x, y, "Heat Pump Financial Screening Report")

    # Thin rule
    y -= 7 * mm
    c.setStrokeColor(COLOR_LINE)
    c.setLineWidth(1.0)
    c.line(center_x - 50 * mm, y, center_x + 50 * mm, y)

    # Report metadata
    y -= 8 * mm
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 10)
    c.drawCentredString(center_x, y, f"Report ID: {report_id}   ·   Generated: {gen_date}")

    # Verdict teaser panel on cover
    teaser_h = 22 * mm
    teaser_y = y - 14 * mm
    panel(c, center_x - 75 * mm, teaser_y, 150 * mm, teaser_h)
    draw_left_accent_bar(c, center_x - 75 * mm, teaser_y, 5 * mm, teaser_h, accent)
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(center_x - 66 * mm, teaser_y - 7 * mm, "Preliminary result")
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(center_x - 66 * mm, teaser_y - 16 * mm, verdict_text)

    # Contact + TOC
    y = teaser_y - teaser_h - 14 * mm
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 9.5)
    c.drawCentredString(center_x, y, "clearheat.ie  ·  info@clearheat.ie")

    y -= 14 * mm
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(center_x, y, "Contents")
    y -= 7 * mm
    toc = [
        ("2", "Executive Summary"),
        ("3–5", "Scenario Analysis (Best / Typical / Worst)"),
        ("6", "Methodology and Disclaimers"),
        ("7", "Glossary"),
    ]
    c.setFillColor(COLOR_TEXT)
    c.setFont("Helvetica", 10)
    for pg, item in toc:
        c.drawCentredString(center_x, y, f"Page {pg}  —  {item}")
        y -= 6 * mm

    c.showPage()

    # ===========================================================
    # Page 2 — Executive Summary
    # ===========================================================
    header_footer(c, 2, total_pages, W, H, margin, subtitle="Executive Summary")
    y = H - margin - 12 * mm

    c.setFillColor(COLOR_TEXT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x0, y, "Executive Summary")
    y -= 8 * mm

    # --- Verdict panel ---
    y = draw_verdict_panel(
        c, x0, y, usable_w,
        verdict_text=verdict_text,
        confidence_basis=confidence_basis,
        what_this_means=what_this_means_bullets,
        accent=accent,
    )

    # --- Bottom line callout ---
    if affordable:
        typ_12yr = (affordable.get("12yr") or {}).get("typical") or {}
        typ_12yr_net = safe_float(typ_12yr.get("affordable_net_eur")) or 0.0
        if quote_provided and personalised:
            pb_typ = personalised.get("payback_years", {}).get("typical")
            net_cost = safe_float(personalised.get("capex_eur"))
            bottom_line = (
                f"Your quoted cost ({eur(net_cost)} net after grant) would typically pay back "
                f"in {years_text(pb_typ)} years. See your quote breakdown below."
                if pb_typ else
                f"Your quoted cost is {eur(net_cost)} net after grant. "
                f"See the scenario pages for full payback projections."
            )
        elif typ_12yr_net > 0:
            bottom_line = (
                f"Based on ~{eur(typ_savings)}/yr savings, you could afford to spend up to "
                f"{eur(typ_12yr_net)} after the SEAI grant and still break even within 12 years."
            )
        else:
            bottom_line = (
                f"Estimated annual savings are ~{eur(typ_savings)}/yr. "
                f"See the table below for what you could afford to spend and still break even."
            )
        y = draw_bottom_line_callout(c, x0, y, usable_w, bottom_line, accent)

    # --- Affordable capex table ---
    if affordable:
        y = affordable_capex_table(
            c, x0, y, usable_w,
            affordable=affordable,
            grant_applied=grant_applied,
            grant_value_eur=grant_value_eur,
            market_verdict=market_verdict,
            typical_irish_range=typical_irish_range,
            annual_savings=typ_savings,
        )

    # --- Your quote (personalised) — only if quote provided ---
    if quote_provided and personalised:
        pb = personalised.get("payback_years", {})
        net_cost = safe_float(personalised.get("capex_eur"))
        quote_gross = safe_float(personalised.get("hp_quote_eur"))
        grant_txt = f"€{int(grant_value_eur):,} SEAI grant applied" if grant_applied else "no grant applied"

        y -= 2 * mm
        y = section_title(c, x0, y, "Your quote")
        panel_qh = 26 * mm
        panel(c, x0, y, usable_w, panel_qh)
        qx = x0 + 5 * mm
        qy = y - 7 * mm

        c.setFillColor(COLOR_PRIMARY)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(qx, qy, f"Quoted: {eur(quote_gross)}   →   Net after grant: {eur(net_cost)}   ({grant_txt})")
        qy -= 7 * mm

        c.setFillColor(COLOR_MUTED)
        c.setFont("Helvetica", 9.5)
        pb_best = years_text(pb.get("best"))
        pb_typ  = years_text(pb.get("typical"))
        pb_wst  = years_text(pb.get("worst"))
        c.drawString(qx, qy, f"Simple payback  —  Best case: {pb_best} yr   ·   Typical: {pb_typ} yr   ·   Worst case: {pb_wst} yr")
        qy -= 6 * mm
        c.setFont("Helvetica-Oblique", 8.5)
        c.drawString(qx, qy, "Payback estimated from your current fuel spend vs projected heat pump running costs.")
        y -= panel_qh + 4 * mm

    # --- Key drivers (top 2 only on exec summary — keeps page from overflowing) ---
    y -= 2 * mm
    y = section_title(c, x0, y, "What's driving this result?")
    drivers = dec.get("key_drivers", []) or []
    if drivers:
        y = draw_bullets(c, x0, y, [str(d) for d in drivers[:2]], usable_w, size=9.2, leading=11.5)
    else:
        y = draw_wrapped(c, x0, y, "Key drivers not available for this run.", usable_w, size=10, color=COLOR_MUTED)

    c.showPage()

    # ===========================================================
    # Scenario pages (3, 4, 5)
    # ===========================================================
    def render_scenario_page(page_num: int, scenario_name: str, scenario_block: Dict[str, Any]) -> None:
        nonlocal y
        header_footer(c, page_num, total_pages, W, H, margin, subtitle=f"{scenario_name} Scenario")

        y = H - margin - 12 * mm
        c.setFillColor(COLOR_TEXT)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(x0, y, f"{scenario_name} Scenario")
        y -= 10 * mm

        annual_savings = safe_float(scenario_block.get("savings_eur")) or 0.0
        years = 20

        if quote_provided:
            # --- Quote provided: show cumulative savings vs actual capex ---
            base = build_cumulative_series(ref_capex, annual_savings, years, elec_uplift=0.00)
            s5   = build_cumulative_series(ref_capex, annual_savings, years, elec_uplift=0.05)
            s10  = build_cumulative_series(ref_capex, annual_savings, years, elec_uplift=0.10)
            s15  = build_cumulative_series(ref_capex, annual_savings, years, elec_uplift=0.15)

            draw_cumulative_graph(
                c, x0, y, usable_w, 98 * mm,
                title=f"Cumulative savings vs your net cost of {eur(ref_capex)}",
                capex=ref_capex,
                series_base=base, series_5=s5, series_10=s10, series_15=s15,
                capex_label=None,  # quote provided: label is in title
            )
            y -= 108 * mm

            y = section_title(c, x0, y, "Key figures (this scenario)")
            y = kv_row(c, x0, y, "Annual savings (base electricity price)", eur(annual_savings), usable_w)
            y = kv_row(c, x0, y, "Simple payback (base price)", f"{years_text(scenario_block.get('payback_years'))} years", usable_w)
            be = find_break_even_year(ref_capex, base)
            y = kv_row(c, x0, y, "Break-even year (base price)",
                       f"Year {be}" if be is not None else "Beyond 20 years", usable_w)

            y -= 2 * mm
            y = section_title(c, x0, y, "How to read this graph")
            explain_lines = [
                f"The horizontal line is your net cost after grant ({eur(ref_capex)}). When the savings line crosses it, the system has paid for itself.",
                "The solid line uses today's electricity prices. The dashed lines show the effect of electricity rising 5%, 10%, or 15% — a useful stress test.",
                "If savings never cross the line within 20 years, the system doesn't pay back under that electricity price scenario.",
            ]
        else:
            # --- No quote: show savings projection with Irish cost band ---
            draw_savings_projection_graph(
                c, x0, y, usable_w, 98 * mm,
                annual_savings=annual_savings,
                typical_irish_net_low=net_low,
                typical_irish_net_high=net_high,
                elec_uplift_levels=[0.0, 0.05, 0.10, 0.15],
            )
            y -= 108 * mm

            # For stats, use the 12yr typical affordable as a reference
            ref_for_stats = float((affordable.get("12yr") or {}).get(
                "best" if scenario_name.startswith("Best") else
                "worst" if scenario_name.startswith("Worst") else "typical",
                {}
            ).get("affordable_net_eur") or ref_capex)

            y = section_title(c, x0, y, "Key figures (this scenario)")
            y = kv_row(c, x0, y, "Annual savings (base electricity price)", eur(annual_savings), usable_w)
            y = kv_row(c, x0, y, "Max spend to break even in 12 yrs (after grant)", eur(ref_for_stats), usable_w)
            typical_be = int(round(ref_for_stats / annual_savings)) if annual_savings > 0 else None
            y = kv_row(c, x0, y, "Implied break-even at typical Irish cost (after grant)",
                       f"~Year {typical_be}" if typical_be and typical_be <= 20 else "Beyond 20 years", usable_w)

            y -= 2 * mm
            y = section_title(c, x0, y, "How to read this graph")
            explain_lines = [
                f"The shaded band ({eur(net_low)}–{eur(net_high)} after grant) shows the typical cost range for an Irish heat pump installation.",
                "The savings lines show how your annual savings accumulate over time. When a line enters the shaded band, savings are starting to cover a typical installation.",
                "The solid line uses today's electricity prices. Dashed lines show electricity rising 5%, 10%, or 15% — your savings reduce as electricity becomes more expensive.",
                "Once you have a quote, re-run with the quote amount for a personalised payback analysis.",
            ]

        y = draw_bullets(c, x0, y, explain_lines, usable_w, size=10, leading=13)
        c.showPage()

    render_scenario_page(3, "Best case",    best)
    render_scenario_page(4, "Typical case", typ)
    render_scenario_page(5, "Worst case",   worst)

    # ===========================================================
    # Page 6 — Methodology and Disclaimers
    # ===========================================================
    header_footer(c, 6, total_pages, W, H, margin, subtitle="Methodology and Disclaimers")
    y = H - margin - 12 * mm

    c.setFillColor(COLOR_TEXT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x0, y, "Methodology and Disclaimers")
    y -= 10 * mm

    y = section_title(c, x0, y, "How this report works")
    y = draw_bullets(c, x0, y, methodology_text(), usable_w, size=10, leading=13)

    y -= 4 * mm
    y = section_title(c, x0, y, "Cross-check" + (" (bills vs BER)" if cross.get("consistency") != "unknown" else ""))
    consistency = title_case_keep_acronyms(str(cross.get("consistency", "unknown")).replace("_", " "))
    notes = cross.get("notes", []) or []
    y = draw_wrapped(c, x0, y, f"Status: {consistency}.", usable_w, size=10, leading=13)
    if notes:
        y -= 2 * mm
        y = draw_bullets(c, x0, y, [str(n) for n in notes[:5]], usable_w, size=10, leading=13)

    y -= 4 * mm
    y = section_title(c, x0, y, "Important disclaimers")
    y = draw_bullets(c, x0, y, disclaimer_text(), usable_w, size=10, leading=13)

    c.showPage()

    # ===========================================================
    # Page 7 — Glossary
    # ===========================================================
    header_footer(c, 7, total_pages, W, H, margin, subtitle="Glossary")
    y = H - margin - 12 * mm

    c.setFillColor(COLOR_TEXT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x0, y, "Glossary")
    y -= 8 * mm
    c.setFillColor(COLOR_MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(x0, y, "Plain-English explanations of the terms used in this report.")
    y -= 10 * mm

    for term, definition in GLOSSARY:
        c.setFillColor(COLOR_PRIMARY)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x0, y, title_case_keep_acronyms(term))
        y -= 5.5 * mm
        y = draw_wrapped(c, x0, y, definition, usable_w, size=9.8, leading=12, color=COLOR_TEXT, sentence_case=True)
        y -= 6 * mm
        if y < margin + 25 * mm:
            c.showPage()
            header_footer(c, 7, total_pages, W, H, margin, subtitle="Glossary (Continued)")
            y = H - margin - 12 * mm

    c.save()
    return buf.getvalue()