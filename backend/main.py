"""
Crowdsourced Treatment Intelligence Platform
FastAPI Backend - Main Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.search import router as search_router
from routes.compare import router as compare_router
from routes.chat import router as chat_router
from nlp.pipeline import pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run NLP pipeline on startup."""
    print("=" * 60)
    print("  Crowdsourced Treatment Intelligence Platform")
    print("  Initializing NLP Pipeline...")
    print("=" * 60)
    pipeline.initialize()
    print("=" * 60)
    print("  Pipeline Ready! API is now serving.")
    print("=" * 60)
    yield
    print("Shutting down...")


app = FastAPI(
    title="Treatment Intelligence API",
    description="AI-powered platform that transforms patient discussions into structured treatment insights",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(search_router)
app.include_router(compare_router)
app.include_router(chat_router)


@app.get("/")
async def root():
    return {
        "name": "Treatment Intelligence API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "search": "/api/search?treatment=Metformin",
            "treatments": "/api/treatments",
            "compare": "/api/compare?treatments=Metformin,Insulin",
            "chat": "POST /api/chat"
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "pipeline_initialized": pipeline.is_initialized,
        "treatments_loaded": len(pipeline.treatments) if pipeline.is_initialized else 0
    }
