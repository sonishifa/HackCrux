"""
Chat API Routes
Conversational AI assistant endpoint.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from nlp.pipeline import pipeline

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/api/chat")
async def chat(request: ChatRequest):
    """AI chat assistant for treatment queries."""
    if not pipeline.is_initialized:
        raise HTTPException(status_code=503, detail="Pipeline is still initializing")

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = pipeline.chat_query(request.message)
    return result
