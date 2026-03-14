"""
Sentiment Analysis Module
Uses TextBlob for lightweight sentiment classification of patient discussions.
"""

from textblob import TextBlob
from typing import Dict, Any


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Analyze sentiment of a patient discussion post.
    Returns sentiment label (positive/negative/neutral) and score.
    """
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity  # -1 to 1

    if polarity > 0.1:
        label = "positive"
    elif polarity < -0.1:
        label = "negative"
    else:
        label = "neutral"

    return {
        "label": label,
        "score": round(polarity, 3),
        "subjectivity": round(blob.sentiment.subjectivity, 3)
    }


def analyze_batch(texts: list) -> list:
    """Analyze sentiment for a batch of texts."""
    return [analyze_sentiment(text) for text in texts]
