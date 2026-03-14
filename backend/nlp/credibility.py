"""
Source Credibility Scoring Module
Scores the credibility of patient discussion posts based on heuristics
like detail level, medical terminology usage, and source type.
"""

from typing import Dict, Any, List
import re


# Medical terminology that suggests informed discussion
MEDICAL_TERMS = {
    "a1c", "hba1c", "fasting glucose", "blood sugar", "blood pressure",
    "dosage", "mg", "mcg", "ml", "prescription", "prescribed",
    "side effect", "adverse", "contraindication", "interaction",
    "diagnosis", "diagnosed", "chronic", "acute", "symptoms",
    "treatment", "therapy", "medication", "physician", "doctor",
    "endocrinologist", "cardiologist", "gastroenterologist",
    "clinical", "study", "research", "evidence", "trial",
    "insulin resistance", "inflammation", "immune", "enzyme",
    "metabolic", "cardiovascular", "gastrointestinal",
    "efficacy", "tolerability", "bioavailability",
}

# Source type weights
SOURCE_WEIGHTS = {
    "reddit": 0.6,
    "forum": 0.65,
    "youtube": 0.5,
    "blog": 0.7,
    "drugs.com": 0.75,
    "pubmed": 0.95,
}


def score_credibility(post: Dict[str, Any]) -> Dict[str, Any]:
    """
    Score the credibility of a patient discussion post.
    Returns a score (0-1) and breakdown of factors.
    """
    text = post.get("text", "") or post.get("full_text", "")
    source = post.get("source", "").lower()
    text_lower = text.lower()
    
    scores = {}
    
    # 1. Detail level (based on word count)
    word_count = len(text.split())
    if word_count >= 100:
        scores["detail_level"] = 1.0
    elif word_count >= 60:
        scores["detail_level"] = 0.8
    elif word_count >= 30:
        scores["detail_level"] = 0.6
    elif word_count >= 15:
        scores["detail_level"] = 0.4
    else:
        scores["detail_level"] = 0.2
    
    # 2. Medical terminology usage
    med_term_count = sum(1 for term in MEDICAL_TERMS if term in text_lower)
    if med_term_count >= 5:
        scores["medical_terms"] = 1.0
    elif med_term_count >= 3:
        scores["medical_terms"] = 0.8
    elif med_term_count >= 1:
        scores["medical_terms"] = 0.6
    else:
        scores["medical_terms"] = 0.3
    
    # 3. Specificity (mentions specific numbers, dosages, timeframes)
    has_numbers = bool(re.search(r'\d+\s*(?:mg|days?|weeks?|months?|%)', text_lower))
    has_timeline = bool(re.search(r'(?:week|month|day)\s*\d', text_lower)) or \
                   bool(re.search(r'\d+\s*(?:weeks?|months?|days?)', text_lower))
    specificity = 0.4
    if has_numbers:
        specificity += 0.3
    if has_timeline:
        specificity += 0.3
    scores["specificity"] = min(1.0, specificity)
    
    # 4. Source type weight
    scores["source_weight"] = SOURCE_WEIGHTS.get(source, 0.5)
    
    # 5. Balanced perspective (mentions both pros and cons)
    has_positive = any(w in text_lower for w in ["helped", "improved", "better", "effective", "works"])
    has_negative = any(w in text_lower for w in ["side effect", "nausea", "pain", "worse", "problem", "issue"])
    if has_positive and has_negative:
        scores["balance"] = 1.0
    elif has_positive or has_negative:
        scores["balance"] = 0.6
    else:
        scores["balance"] = 0.3
    
    # Calculate weighted average
    weights = {
        "detail_level": 0.25,
        "medical_terms": 0.2,
        "specificity": 0.2,
        "source_weight": 0.15,
        "balance": 0.2,
    }
    
    total_score = sum(scores[k] * weights[k] for k in weights)
    
    # Label
    if total_score >= 0.75:
        label = "high"
    elif total_score >= 0.5:
        label = "medium"
    else:
        label = "low"
    
    return {
        "score": round(total_score, 2),
        "label": label,
        "breakdown": {k: round(v, 2) for k, v in scores.items()},
    }


def score_batch(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Score credibility for a batch of posts."""
    return [score_credibility(post) for post in posts]
