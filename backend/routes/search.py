"""
Search API Routes — SSE streaming + regular search endpoints.
"""

import json
import time
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from nlp.pipeline import pipeline

router = APIRouter()


@router.get("/api/search")
async def search_treatment(treatment: str = Query(..., description="Treatment name to search")):
    """Search for treatment intelligence. Scrapes all sources live."""
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    result = pipeline.search_treatment(treatment)

    if result is None:
        available = pipeline.get_treatments_list()
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"No data found for '{treatment}'. Live scraping found no relevant posts.",
                "available_treatments": available,
                "active_sources": pipeline.active_scrapers,
            }
        )
    return result


@router.get("/api/search/stream")
async def search_treatment_stream(treatment: str = Query(..., description="Treatment name")):
    """
    SSE streaming search — emits progress events as scraping proceeds.
    Frontend connects via EventSource and receives stage updates in real time.
    """
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    def event_stream():
        # Reset progress log
        pipeline.progress_log = []

        # Emit start event
        yield f"data: {json.dumps({'stage': 'started', 'treatment': treatment})}\n\n"

        # Emit normalizing stage
        yield f"data: {json.dumps({'stage': 'progress', 'message': f'Normalizing treatment name...'})}\n\n"

        # Run the full pipeline (blocking — runs scraping + NLP)
        result = pipeline.search_treatment(treatment)

        # Emit all accumulated progress log entries
        for log_entry in pipeline.progress_log:
            yield f"data: {json.dumps({'stage': 'progress', 'message': log_entry})}\n\n"

        if result:
            yield f"data: {json.dumps({'stage': 'complete', 'data': result})}\n\n"
        else:
            yield f"data: {json.dumps({'stage': 'not_found', 'treatment': treatment})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/api/treatments")
async def list_treatments():
    """List all available treatments."""
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    return {
        "treatments": pipeline.get_treatments_list(),
        "total": len(pipeline.treatments),
        "active_sources": pipeline.active_scrapers,
    }


@router.get("/api/stats")
async def get_stats():
    """Get pipeline stats for frontend header."""
    if not pipeline.is_initialized:
        return {"status": "initializing"}
    return pipeline.get_stats()
