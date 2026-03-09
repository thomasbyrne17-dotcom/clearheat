from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from engine import run_analysis
from pdf_report import build_pdf
from database import Calculation, Lead, create_tables, get_db
import resend

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PDF_KEY = os.getenv("CLEARHEAT_PDF_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
INSTALLER_EMAIL = os.getenv("INSTALLER_EMAIL", "")
CLEARHEAT_FROM_EMAIL = os.getenv("CLEARHEAT_FROM_EMAIL", "noreply@clearheat.ie")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Heat Pump Payback API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://clearheat.ie",
        "https://www.clearheat.ie",
    ],
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


# ---------------------------------------------------------------------------
# Legacy in-memory store — kept so report IDs resolve for PDF serving
# ---------------------------------------------------------------------------

REPORT_STORE: dict[str, dict[str, Any]] = {}
REPORT_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def _cleanup_store() -> None:
    now = time.time()
    expired = [rid for rid, rec in REPORT_STORE.items()
               if now - rec.get("created_at", now) > REPORT_TTL_SECONDS]
    for rid in expired:
        REPORT_STORE.pop(rid, None)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _get_decision(report: Any) -> dict[str, Any]:
    if isinstance(report, dict):
        d = report.get("decision") or {}
        if isinstance(d, dict):
            return d
    return {}


def _extract_verdict(report: Any) -> tuple[Optional[str], str]:
    decision = _get_decision(report)
    verdict_class = decision.get("verdict")
    verdict_text = decision.get("verdict_text") or "Your Heat Pump Financial Verdict"
    if not verdict_text and verdict_class:
        verdict_text = str(verdict_class)
    return (verdict_class, verdict_text)


def _extract_confidence_text(report: Any) -> str:
    return _get_decision(report).get("confidence_text") or ""


def _extract_payback(report: Any) -> Optional[float]:
    try:
        scenarios = report.get("scenarios") or {}
        typical = scenarios.get("typical") or {}
        return typical.get("simple_payback_years")
    except Exception:
        return None


def _extract_npv(report: Any) -> Optional[float]:
    try:
        scenarios = report.get("scenarios") or {}
        typical = scenarios.get("typical") or {}
        return typical.get("npv_eur")
    except Exception:
        return None


def _build_preview_copy(verdict_class: Optional[str]) -> tuple[str, str]:
    if verdict_class == "likely_saves":
        return (
            "Likely positive — worth validating before you commit",
            "The full report shows the specific conditions that keep this outcome positive (design, flow temperature, tariff).",
        )
    if verdict_class == "borderline":
        return (
            "Borderline — one assumption can flip the result",
            "The full report shows exactly what would need to change for this to become clearly positive (or clearly negative).",
        )
    if verdict_class == "unlikely_saves":
        return (
            "Not favourable under current inputs",
            "The full report explains what would need to change for a heat pump to make financial sense.",
        )
    return (
        "Independent screening estimate ready",
        "See the quantified outcome, scenarios, and what can flip the result.",
    )


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    inputs: Dict[str, Any]


class EmailReportRequest(BaseModel):
    calculation_id: str
    email: str


class LeadRequest(BaseModel):
    calculation_id: str
    name: str
    email: str
    phone: Optional[str] = None
    county: Optional[str] = None
    house_type: Optional[str] = None
    intent_timeline: Optional[str] = None
    consent_installer_contact: bool = False
    consent_marketing: bool = False


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run")
def run(req: AnalysisRequest):
    try:
        return run_analysis(req.inputs)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post("/generate")
def generate(req: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Runs the analysis, builds the PDF, stores result in Postgres + in-memory cache.
    Returns reportId + verdictClass to the frontend.
    """
    try:
        _cleanup_store()

        report = run_analysis(req.inputs)
        pdf_bytes = build_pdf(report)
        report_id = uuid.uuid4().hex

        verdict_class, _ = _extract_verdict(report)
        confidence_text = _extract_confidence_text(report)
        payback = _extract_payback(report)
        npv = _extract_npv(report)

        inputs = req.inputs

        # Persist to Postgres (anonymous — no PII at this stage)
        calc = Calculation(
            id=report_id,
            created_at=datetime.now(timezone.utc),
            county=inputs.get("county"),
            house_type=inputs.get("house_type"),
            ber_band=inputs.get("ber_band"),
            floor_area_m2=inputs.get("floor_area_m2"),
            emitters=inputs.get("emitters"),
            flow_temp_capability=inputs.get("flow_temp_capability"),
            heating_pattern=inputs.get("heating_pattern"),
            wood_use=inputs.get("wood_use"),
            occupants=inputs.get("occupants"),
            fuel_type=inputs.get("fuel_type"),
            bill_mode=inputs.get("bill_mode"),
            annual_spend_eur=inputs.get("annual_spend_eur"),
            annual_fuel_use=inputs.get("annual_fuel_use"),
            electricity_price_eur_per_kwh=inputs.get("electricity_price_eur_per_kwh"),
            hp_quote_eur=inputs.get("hp_quote_eur"),
            grant_applied=inputs.get("grant_applied"),
            grant_value_eur=inputs.get("grant_value_eur"),
            hp_capex_eur=inputs.get("hp_capex_eur"),
            verdict_class=verdict_class,
            confidence_text=confidence_text,
            payback_years_typical=payback,
            npv_typical_eur=npv,
        )
        db.add(calc)
        db.commit()

        # Keep in-memory cache for fast PDF serving within the session
        REPORT_STORE[report_id] = {
            "created_at": time.time(),
            "inputs": inputs,
            "report": report,
            "pdf_bytes": pdf_bytes,
            "verdict_class": verdict_class,
        }

        return {"reportId": report_id, "verdictClass": verdict_class}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.get("/report/{report_id}/preview")
def report_preview(report_id: str):
    """Returns the preview payload for the report page."""
    _cleanup_store()

    rec = REPORT_STORE.get(report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found or expired")

    report = rec["report"]
    if not isinstance(report, dict):
        raise HTTPException(status_code=500, detail="Unexpected report format")

    verdict_class, _ = _extract_verdict(report)
    confidence_text = _extract_confidence_text(report)
    preview_headline, preview_context = _build_preview_copy(verdict_class)

    inputs = report.get("inputs") or {}
    if not isinstance(inputs, dict):
        inputs = {}

    return {
        "reportId": report_id,
        "verdictClass": verdict_class,
        "confidence": confidence_text,
        "headline": preview_headline,
        "context": preview_context,
        "grossQuoteEur": inputs.get("hp_quote_eur"),
        "netCapexEur": inputs.get("hp_capex_eur"),
        "disclaimerLine": "Independent screening estimate — not affiliated with installers or manufacturers.",
        "sections": [
            "Executive summary",
            "Best / typical / worst scenarios",
            "Methodology and disclaimers",
            "Glossary",
        ],
    }


@app.get("/report/{report_id}/pdf")
def report_pdf(report_id: str):
    """Returns the PDF — free, no paywall."""
    _cleanup_store()

    rec = REPORT_STORE.get(report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found or expired")

    return Response(
        content=rec["pdf_bytes"],
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=clearheat_report.pdf"},
    )


GOOGLE_REVIEW_URL = os.getenv("GOOGLE_REVIEW_URL", "")


@app.post("/email-report")
def email_report(req: EmailReportRequest, db: Session = Depends(get_db)):
    """
    Emails the PDF report to the homeowner.
    Stores their email on the calculation record and sends a review request.
    """
    _cleanup_store()

    rec = REPORT_STORE.get(req.calculation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found or expired.")

    pdf_bytes = rec["pdf_bytes"]
    verdict_class = rec.get("verdict_class")

    # Store email on calculation record
    calc = db.query(Calculation).filter(Calculation.id == req.calculation_id).first()
    if calc:
        calc.subscriber_email = req.email
        calc.report_emailed_at = datetime.now(timezone.utc)
        db.commit()

    _send_report_email(req.email, req.calculation_id, pdf_bytes, verdict_class)

    return {"success": True}


def _send_report_email(email: str, report_id: str, pdf_bytes: bytes, verdict_class: Optional[str]) -> None:
    """Sends the PDF report to the homeowner with a review request. Fails silently."""
    if not RESEND_API_KEY:
        return

    try:
        import base64

        review_section = ""
        if GOOGLE_REVIEW_URL:
            review_section = f"""
<p style="margin-top:24px;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;">
  <strong>Found this useful?</strong><br>
  A quick Google review helps other Irish homeowners find independent advice before committing to a heat pump.<br>
  <a href="{GOOGLE_REVIEW_URL}" style="color:#16a34a;">Leave a review →</a>
</p>
"""

        verdict_labels = {
            "likely_saves": "Likely to Save",
            "borderline": "Borderline",
            "unlikely_saves": "Unlikely to Save",
        }
        verdict_label = verdict_labels.get(verdict_class or "", "Complete")

        html_body = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="font-size:20px;">Your ClearHeat Report</h2>

  <p>Your heat pump financial analysis is attached. Verdict: <strong>{verdict_label}</strong>.</p>

  <p style="font-size:14px;color:#555;">
    This is an independent screening estimate based on the inputs you provided.
    It is not a substitute for a detailed design survey by a qualified installer.
  </p>

  {review_section}

  <p style="margin-top:32px;font-size:12px;color:#888;">
    ClearHeat — Independent heat pump financial screening for Irish homeowners.<br>
    Not affiliated with any installer or manufacturer.
  </p>
</div>
"""

        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

        resend.Emails.send({
            "from": CLEARHEAT_FROM_EMAIL or "noreply@clearheat.ie",
            "to": email,
            "subject": f"Your ClearHeat Report — {verdict_label}",
            "html": html_body,
            "attachments": [
                {
                    "filename": "clearheat_report.pdf",
                    "content": pdf_b64,
                }
            ],
        })

    except Exception as e:
        print(f"Warning: report email failed: {e}")


@app.post("/leads")
def submit_lead(req: LeadRequest, db: Session = Depends(get_db)):
    """
    Captures a homeowner lead with explicit consent.
    Writes to Postgres and fires an email to the installer.
    """
    if not req.consent_installer_contact:
        raise HTTPException(status_code=400, detail="Installer contact consent is required.")

    calc = db.query(Calculation).filter(Calculation.id == req.calculation_id).first()

    lead = Lead(
        calculation_id=req.calculation_id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        county=req.county or (calc.county if calc else None),
        house_type=req.house_type or (calc.house_type if calc else None),
        verdict_class=calc.verdict_class if calc else None,
        payback_years_typical=calc.payback_years_typical if calc else None,
        hp_quote_eur=calc.hp_quote_eur if calc else None,
        grant_value_eur=calc.grant_value_eur if calc else None,
        ber_band=calc.ber_band if calc else None,
        floor_area_m2=calc.floor_area_m2 if calc else None,
        intent_timeline=req.intent_timeline,
        consent_installer_contact=req.consent_installer_contact,
        consent_marketing=req.consent_marketing,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    _send_installer_notification(lead)

    return {"success": True, "leadId": lead.id}


def _send_installer_notification(lead: Lead) -> None:
    """Sends a formatted lead email to the installer. Fails silently."""
    if not RESEND_API_KEY or not INSTALLER_EMAIL:
        return

    try:
        payback_str = f"{lead.payback_years_typical:.1f} years" if lead.payback_years_typical else "N/A"
        quote_str = f"€{lead.hp_quote_eur:,.0f}" if lead.hp_quote_eur else "N/A"
        grant_str = f"€{lead.grant_value_eur:,.0f}" if lead.grant_value_eur else "N/A"
        floor_str = f"{lead.floor_area_m2:.0f} m²" if lead.floor_area_m2 else "N/A"
        phone_str = lead.phone or "Not provided"
        timeline_labels = {
            "researching": "Just researching",
            "within_12_months": "Within 12 months",
            "within_3_months": "Within 3 months",
        }
        timeline_str = timeline_labels.get(lead.intent_timeline or "", "Not specified")

        html_body = f"""
<h2>New ClearHeat Lead</h2>
<p>A homeowner has requested installer quotes via ClearHeat.</p>

<h3>Contact Details</h3>
<table cellpadding="6">
  <tr><td><strong>Name</strong></td><td>{lead.name}</td></tr>
  <tr><td><strong>Email</strong></td><td>{lead.email}</td></tr>
  <tr><td><strong>Phone</strong></td><td>{phone_str}</td></tr>
  <tr><td><strong>Timeline</strong></td><td>{timeline_str}</td></tr>
</table>

<h3>Property Details</h3>
<table cellpadding="6">
  <tr><td><strong>County</strong></td><td>{lead.county or 'N/A'}</td></tr>
  <tr><td><strong>House type</strong></td><td>{lead.house_type or 'N/A'}</td></tr>
  <tr><td><strong>BER band</strong></td><td>{lead.ber_band or 'N/A'}</td></tr>
  <tr><td><strong>Floor area</strong></td><td>{floor_str}</td></tr>
</table>

<h3>ClearHeat Analysis</h3>
<table cellpadding="6">
  <tr><td><strong>Verdict</strong></td><td>{lead.verdict_class or 'N/A'}</td></tr>
  <tr><td><strong>Estimated payback</strong></td><td>{payback_str}</td></tr>
  <tr><td><strong>HP quote (gross)</strong></td><td>{quote_str}</td></tr>
  <tr><td><strong>SEAI grant</strong></td><td>{grant_str}</td></tr>
</table>

<p style="color:#888;font-size:12px;margin-top:24px;">
  ClearHeat — Independent heat pump financial screening for Irish homeowners.<br>
  This homeowner has consented to be contacted by an installer.
</p>
"""

        resend.Emails.send({
            "from": CLEARHEAT_FROM_EMAIL,
            "to": INSTALLER_EMAIL,
            "subject": f"New ClearHeat Lead — {lead.county or 'Ireland'} | {lead.verdict_class or 'Verdict pending'}",
            "html": html_body,
        })

        lead.installer_notified = True
        lead.installer_email_sent_at = datetime.now(timezone.utc)

    except Exception as e:
        print(f"Warning: installer email failed: {e}")


# ---------------------------------------------------------------------------
# Legacy internal PDF endpoint (key-protected)
# ---------------------------------------------------------------------------

@app.post("/pdf")
def pdf(
    req: AnalysisRequest,
    x_clearheat_pdf_key: str | None = Header(default=None),
):
    if not PDF_KEY or x_clearheat_pdf_key != PDF_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        report = run_analysis(req.inputs)
        pdf_bytes = build_pdf(report)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=clearheat_report.pdf"},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")
