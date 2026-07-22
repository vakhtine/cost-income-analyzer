from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.services import AnalysisService

app = FastAPI(
    title="Cost & Income Analyzer API",
    description="Privacy-first finance analysis. Uploads are never stored.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = AnalysisService()


class LocationCompareRequest(BaseModel):
    period_rows: dict[str, list[dict]] = Field(
        description="Period name to transaction rows returned from /api/analyze"
    )
    reference_city: str
    household_size: int = 1
    period_name: str | None = "All periods"


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/cities")
def get_cities() -> dict[str, list[str]]:
    return {"cities": service.list_cities()}


@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required.")

    filename = file.filename.lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Upload a .csv or .xlsx file.")

    content = await file.read()
    try:
        periods = service.parse_file(file.filename, content)
        return service.build_response(periods)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Could not analyze the uploaded file.") from error


@app.post("/api/compare-location")
def compare_location(request: LocationCompareRequest) -> dict:
    try:
        periods = service.records_to_periods(request.period_rows)
        return service.compare_location(
            periods,
            request.reference_city,
            request.household_size,
            request.period_name,
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail="Could not compare locations.") from error
