"""
Sentiment Analysis Module
Uses VADER (Valence Aware Dictionary and sEntiment Reasoner) for fast,
rule-based sentiment analysis. Sub-millisecond latency, no model downloads.
Tuned for social media text which works well for patient forum discussions.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import Dict, Any, List


# Initialize analyzer once at module level
_analyzer = SentimentIntensityAnalyzer()


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Analyze sentiment of a patient discussion post using VADER.
    Returns sentiment label (positive/negative/neutral) and compound score.
    
    VADER compound score ranges from -1 (most negative) to +1 (most positive):
    - positive: compound >= 0.05
    - negative: compound <= -0.05
    - neutral: between -0.05 and 0.05
    """
    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]

    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"

    return {
        "label": label,
        "score": round(compound, 3),
        "details": {
            "positive": round(scores["pos"], 3),
            "negative": round(scores["neg"], 3),
            "neutral": round(scores["neu"], 3),
        }
    }


def analyze_batch(texts: list) -> list:
    """Analyze sentiment for a batch of texts."""
    return [analyze_sentiment(text) for text in texts]
