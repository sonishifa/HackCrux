"""
Search API Routes
Treatment search and listing endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from nlp.pipeline import pipeline

router = APIRouter()


@router.get("/api/search")
async def search_treatment(treatment: str = Query(..., description="Treatment name to search")):
    """Search for treatment intelligence data."""
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    result = pipeline.search_treatment(treatment)
    if result is None:
        # Return list of available treatments
        available = pipeline.get_treatments_list()
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"No data found for '{treatment}'",
                "available_treatments": available
            }
        )
    return result


@router.get("/api/treatments")
async def list_treatments():
    """List all available treatments with basic stats."""
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    return {
        "treatments": pipeline.get_treatments_list(),
        "total": len(pipeline.treatments)
    }
