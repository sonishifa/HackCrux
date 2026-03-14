"""
Compare API Routes
Treatment comparison endpoint.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
from nlp.pipeline import pipeline

router = APIRouter()


@router.get("/api/compare")
async def compare_treatments(
    treatments: str = Query(..., description="Comma-separated treatment names")
):
    """Compare multiple treatments side by side."""
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    treatment_list = [t.strip() for t in treatments.split(",")]

    if len(treatment_list) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least 2 treatments to compare (comma-separated)"
        )

    result = pipeline.compare_treatments(treatment_list)

    if not result:
        available = pipeline.get_treatments_list()
        raise HTTPException(
            status_code=404,
            detail={
                "message": "No data found for the specified treatments",
                "available_treatments": available
            }
        )

    return {"comparison": result}
