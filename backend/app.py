from __future__ import annotations

import os
from typing import Any, Dict

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



class AnalysisRequest(BaseModel):
    # Accept a dict so the frontend can evolve without rewriting the backend.
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


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
