from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
from fastapi.responses import Response
from pdf_report import build_pdf


from engine import run_analysis  # imports your engine.py


app = FastAPI(
    title="Heat Pump Payback API",
    version="0.1.0",
)

# Allow your future frontend (localhost, Vercel, etc.) to call the API.
# For production, lock this down to your real domain(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://clearheat.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    # We accept a dict so your frontend can evolve without rewriting the backend.
    inputs: Dict[str, Any]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run")
def run(req: AnalysisRequest):
    try:
        report = run_analysis(req.inputs)
        return report
    except ValueError as e:
        # Validation errors from your engine
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected errors
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")

@app.post("/pdf")
def pdf(req: AnalysisRequest):
    try:
        report = run_analysis(req.inputs)
        pdf_bytes = build_pdf(report)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=heat_pump_report.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")
