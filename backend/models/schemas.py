"""
Pydantic schemas for API responses.
Covers all layers of the Treatment Intelligence Platform.
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


class CredibilityBreakdown(BaseModel):
    detail_level: Optional[float] = None
    medical_terms: Optional[float] = None
    specificity: Optional[float] = None
    source_weight: Optional[float] = None
    balance: Optional[float] = None


class PostCredibility(BaseModel):
    score: float
    label: str
    breakdown: CredibilityBreakdown


class PostMisinfo(BaseModel):
    is_flagged: bool
    confidence: float
    reasons: List[str]
    categories: List[str]


class SourcePost(BaseModel):
    id: int
    source: str
    text: str
    full_text: str
    timestamp: str
    url: str
    sentiment: str
    side_effects: List[str]
    credibility: Optional[PostCredibility] = None
    misinfo: Optional[PostMisinfo] = None
    rating: Optional[float] = None
    video_title: Optional[str] = None


class Sources(BaseModel):
    breakdown: Dict[str, int]
    total_posts: int


class CredibilityDistribution(BaseModel):
    high: int
    medium: int
    low: int


class Credibility(BaseModel):
    average_score: float
    average_label: str
    distribution: CredibilityDistribution


class Misinformation(BaseModel):
    flagged_count: int
    total_posts: int
    flagged_pct: float
    categories: Dict[str, int]
    top_reasons: List[str]


class TopicItem(BaseModel):
    theme: str
    keywords: List[str]
    keyword_counts: Dict[str, int]
    relevance_score: float
    total_mentions: int


class PubMedStudy(BaseModel):
    title: str
    url: str
    year: int
    journal: str


class PubMedEvidence(BaseModel):
    studies_count: int
    confirmed_side_effects: List[str]
    top_studies: List[PubMedStudy]


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
    credibility: Optional[Credibility] = None
    misinformation: Optional[Misinformation] = None
    topics: Optional[List[TopicItem]] = None
    source_posts: List[SourcePost]
    pubmed_evidence: Optional[PubMedEvidence] = None


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
    credibility: Optional[Credibility] = None
    misinformation: Optional[Misinformation] = None
