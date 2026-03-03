from __future__ import annotations

import os
import time
import uuid
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from engine import run_analysis
from pdf_report import build_pdf

PDF_KEY = os.getenv("CLEARHEAT_PDF_KEY")

app = FastAPI(
    title="Heat Pump Payback API",
    version="0.1.0",
)

# Allow frontend domains to call the API
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

# =========================
# MVP in-memory report store
# =========================
REPORT_STORE: dict[str, dict[str, Any]] = {}
REPORT_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def _cleanup_store() -> None:
    now = time.time()
    expired: list[str] = []
    for rid, rec in REPORT_STORE.items():
        created_at = rec.get("created_at", now)
        if now - created_at > REPORT_TTL_SECONDS:
            expired.append(rid)
    for rid in expired:
        REPORT_STORE.pop(rid, None)


def _get_decision(report: Any) -> dict[str, Any]:
    if isinstance(report, dict):
        d = report.get("decision") or {}
        if isinstance(d, dict):
            return d
    return {}


def _extract_verdict(report: Any) -> tuple[Optional[str], str]:
    """
    Returns (verdict_class, verdict_text)
    verdict_class is the machine label (e.g. borderline / likely_saves / unlikely_saves)
    verdict_text is human (e.g. "Borderline — depends on design and use")
    """
    decision = _get_decision(report)

    verdict_class = decision.get("verdict")
    verdict_text = decision.get("verdict_text") or "Your Heat Pump Financial Verdict"

    # If verdict_text is missing but class exists, create a minimal fallback
    if not verdict_text and verdict_class:
        verdict_text = str(verdict_class)

    return (verdict_class, verdict_text)


def _extract_confidence_text(report: Any) -> str:
    decision = _get_decision(report)
    # Your PDF shows "Confidence: 90/100 (High)" style. :contentReference[oaicite:2]{index=2}
    # In engine_v2 you have confidence_text already.
    return decision.get("confidence_text") or ""


def _build_preview_copy(verdict_class: Optional[str]) -> tuple[str, str]:
    """
    Preview-only wording: builds tension, distinct from paid report wording.
    No numbers, no payback, no NPV.
    """
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

    # Unknown / future verdicts
    return (
        "Independent screening estimate ready",
        "Unlock the full report to see the quantified outcome, scenarios, and what can flip the result.",
    )


class AnalysisRequest(BaseModel):
    inputs: Dict[str, Any]


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
def generate(req: AnalysisRequest):
    """
    Generates analysis + PDF, stores both temporarily, returns a reportId + verdictClass.
    Frontend redirects to /report-preview?reportId=...
    """
    try:
        _cleanup_store()

        report = run_analysis(req.inputs)
        pdf_bytes = build_pdf(report)

        report_id = uuid.uuid4().hex

        verdict_class, _verdict_text = _extract_verdict(report)

        REPORT_STORE[report_id] = {
            "created_at": time.time(),
            "inputs": req.inputs,
            "report": report,
            "pdf_bytes": pdf_bytes,
            "verdict_class": verdict_class,
            "paid": False,  # later: set True from Stripe webhook
        }

        return {"reportId": report_id, "verdictClass": verdict_class}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.get("/report/{report_id}/preview")
def report_preview(report_id: str):
    """
    Minimal but professional interstitial payload, aligned to the PDF tone:
    - "Independent screening estimate" framing
    - verdict class + confidence band
    - tension copy (distinct from paid report wording)
    - dynamic gross quote + net capex for price anchoring
    """
    _cleanup_store()

    rec = REPORT_STORE.get(report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found or expired")

    report = rec["report"]
    if not isinstance(report, dict):
        raise HTTPException(status_code=500, detail="Unexpected report format")

    verdict_class, verdict_text_paid = _extract_verdict(report)
    confidence_text = _extract_confidence_text(report)

    # Preview-only tension copy (do not use the paid verdict_text)
    preview_headline, preview_context = _build_preview_copy(verdict_class)

    # Pull inputs for dynamic anchors
    inputs = report.get("inputs") or {}
    if not isinstance(inputs, dict):
        inputs = {}

    gross_quote = inputs.get("hp_quote_eur")       # user-entered quote
    net_capex = inputs.get("hp_capex_eur")         # after grant, what they pay

    # Optionally expose the paid verdict text internally for later, but do NOT show it on preview page
    # (We return it here only if you decide to show it after payment; currently omit.)
    return {
        "reportId": report_id,
        "verdictClass": verdict_class,
        "confidence": confidence_text,
        "headline": preview_headline,
        "context": preview_context,
        "grossQuoteEur": gross_quote,
        "netCapexEur": net_capex,
        "disclaimerLine": "Independent screening estimate — not affiliated with installers or manufacturers.",
        # This is useful if later you want to show "Executive summary / Scenarios / Methodology / Glossary"
        "sections": [
            "Executive summary",
            "Best / typical / worst scenarios",
            "Methodology and disclaimers",
            "Glossary",
        ],
    }


@app.get("/report/{report_id}/pdf")
def report_pdf(report_id: str):
    """
    Returns the PDF bytes for a previously generated report.
    You can later lock this behind payment by checking rec["paid"].
    """
    _cleanup_store()

    rec = REPORT_STORE.get(report_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Report not found or expired")

    pdf_bytes = rec["pdf_bytes"]

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=clearheat_report.pdf"},
    )


@app.post("/pdf")
def pdf(
    req: AnalysisRequest,
    x_clearheat_pdf_key: str | None = Header(default=None),
):
    # 🔒 Hard lock (also protects you if the env var isn't set)
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