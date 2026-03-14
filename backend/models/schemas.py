"""
Pydantic schemas for API responses.
"""

from pydantic import BaseModel
from typing import List, Dict, Optional, Any


class SideEffect(BaseModel):
    name: str
    count: int
    percentage: float


class SentimentDistribution(BaseModel):
    positive_pct: float
    negative_pct: float
    neutral_pct: float


class Sentiment(BaseModel):
    positive: int
    negative: int
    neutral: int
    average_score: float
    total: int
    distribution: SentimentDistribution


class Effectiveness(BaseModel):
    positive_reports: int
    negative_reports: int
    positive_pct: float
    negative_pct: float
    effectiveness_label: str


class Combination(BaseModel):
    name: str
    count: int


class Dosage(BaseModel):
    dosage: str
    count: int


class TimelinePhase(BaseModel):
    phase: str
    title: str
    description: str
    type: str
    mentions: int


class SourcePost(BaseModel):
    id: int
    source: str
    text: str
    full_text: str
    timestamp: str
    url: str
    sentiment: str
    side_effects: List[str]


class Sources(BaseModel):
    breakdown: Dict[str, int]
    total_posts: int


class TreatmentIntelligence(BaseModel):
    treatment: str
    total_discussions: int
    side_effects: List[SideEffect]
    sentiment: Sentiment
    effectiveness: Effectiveness
    combinations: List[Combination]
    dosages: List[Dosage]
    recovery_timeline: List[TimelinePhase]
    sources: Sources
    source_posts: List[SourcePost]


class TreatmentSummary(BaseModel):
    name: str
    total_discussions: int
    sentiment_score: float
    top_side_effect: str


class ChatRequest(BaseModel):
    message: str


class ChatSource(BaseModel):
    source: str
    text: str
    url: str


class ChatResponse(BaseModel):
    response: str
    sources: List[ChatSource]
    treatment: Optional[str] = None
    total_discussions: Optional[int] = None


class ComparisonItem(BaseModel):
    treatment: str
    total_discussions: int
    top_side_effects: List[SideEffect]
    sentiment: Sentiment
    effectiveness: Effectiveness
    top_combinations: List[Combination]
