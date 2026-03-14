"""
Crowdsourced Treatment Intelligence Platform — API Server.
Fully dynamic, no sample data. All live data from Reddit, PubMed, Drugs.com, YouTube.
"""

import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.search import router as search_router
from routes.compare import router as compare_router
from routes.chat import router as chat_router
from routes.nearby import router as nearby_router
from nlp.pipeline import pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize pipeline on startup."""
    print("=" * 60)
    print("  Crowdsourced Treatment Intelligence Platform")
    print("  Initializing Dynamic Pipeline...")
    print("  Sources: Reddit JSON • PubMed • Drugs.com • YouTube")
    print("  NLP: VADER • Pattern NER • Groq LLM (optional)")
    print("=" * 60)
    pipeline.initialize()
    print("=" * 60)
    print("  Pipeline Ready! API is now serving.")
    print(f"  🟢 Live Scraping: ALWAYS ON")
    print(f"     Active sources: {', '.join(pipeline.active_scrapers)}")
    print("  Search for ANY treatment — live data will be fetched!")
    if os.getenv("GROQ_API_KEY"):
        print("  🧠 Groq LLM: ENABLED (RAG chat, smart NER, timeline synthesis)")
    else:
        print("  ⚪ Groq LLM: DISABLED (add GROQ_API_KEY for AI features)")
    if os.getenv("YOUTUBE_API_KEY"):
        print("  ▶️  YouTube: ENABLED")
    else:
        print("  ⚪ YouTube: DISABLED (add YOUTUBE_API_KEY)")
    print("=" * 60)
    yield
    print("Shutting down...")


app = FastAPI(
    title="Crowdsourced Treatment Intelligence API",
    description="AI-powered platform aggregating patient discussions into structured treatment insights. "
                "Live data from Reddit, PubMed, Drugs.com, and YouTube.",
    version="3.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(search_router)
app.include_router(compare_router)
app.include_router(chat_router)
app.include_router(nearby_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "pipeline_ready": pipeline.is_initialized,
        "source_status": pipeline.get_source_status(),
    }
