"""
Misinformation Detection Module
Flags potential misinformation in patient discussions using pattern matching
and heuristic rules. Returns a flag and reason string.
"""

import re
from typing import Dict, Any, List


# Patterns that indicate potential misinformation
CURE_CLAIM_PATTERNS = [
    r'\b(?:cures?|cured)\b.*\b(?:100%|completely|totally|definitely|guaranteed)\b',
    r'\b(?:100%|completely|totally|definitely|guaranteed)\b.*\b(?:cures?|cured)\b',
    r'\b(?:miracle|magic)\s+(?:cure|treatment|pill|drug)\b',
    r'\bguaranteed\s+(?:to\s+)?(?:cure|heal|fix|work)\b',
    r'\bcure[sd]?\s+(?:all|every|any)\b',
    r'\bno\s+side\s+effects?\s+(?:at\s+all|whatsoever|ever)\b',
]

ANTI_SCIENCE_PATTERNS = [
    r'\b(?:big\s+pharma|pharma\s+conspiracy|they\s+don\'t\s+want\s+you\s+to\s+know)\b',
    r'\b(?:doctors?\s+(?:are|is)\s+(?:lying|hiding|covering))\b',
    r'\b(?:government|fda|who)\s+(?:is|are)\s+(?:hiding|suppressing|covering)\b',
    r'\b(?:natural|organic)\s+(?:is\s+)?(?:always|100%)\s+(?:better|safer)\b',
    r'\b(?:don\'t\s+(?:trust|believe)\s+(?:doctors?|medicine|science))\b',
    r'\b(?:all\s+(?:drugs?|medications?|medicine)\s+(?:are|is)\s+(?:poison|toxic|bad))\b',
]

DANGEROUS_ADVICE_PATTERNS = [
    r'\b(?:stop|quit|don\'t)\s+(?:taking|using)\s+(?:your|all|any)\s+(?:medication|medicine|drugs?|pills?)\b',
    r'\b(?:replace|substitute)\s+(?:your\s+)?(?:medication|medicine)\s+with\b',
    r'\b(?:you\s+don\'t\s+need|don\'t\s+need\s+any)\s+(?:medication|medicine|doctors?)\b',
    r'\b(?:throw\s+away|flush)\s+(?:your\s+)?(?:medication|medicine|pills?)\b',
]

EXTREME_CLAIMS = [
    r'\b(?:works?\s+for\s+(?:everyone|everybody|all\s+people))\b',
    r'\b(?:no\s+(?:one|body)\s+(?:needs?|should\s+take))\s+(?:medication|medicine)\b',
    r'\b(?:only|just)\s+(?:cure|treatment|solution)\b',
    r'\b(?:instantly|immediately)\s+(?:cures?|heals?|fixes?)\b',
]


def detect_misinformation(text: str) -> Dict[str, Any]:
    """
    Analyze text for potential misinformation.
    Returns dict with is_flagged, confidence, reasons list, and category.
    """
    text_lower = text.lower()
    reasons = []
    categories = []
    
    # Check cure claims
    for pattern in CURE_CLAIM_PATTERNS:
        if re.search(pattern, text_lower):
            reasons.append("Contains unsubstantiated cure claims")
            categories.append("cure_claim")
            break
    
    # Check anti-science content
    for pattern in ANTI_SCIENCE_PATTERNS:
        if re.search(pattern, text_lower):
            reasons.append("Contains anti-science or conspiracy language")
            categories.append("anti_science")
            break
    
    # Check dangerous medical advice
    for pattern in DANGEROUS_ADVICE_PATTERNS:
        if re.search(pattern, text_lower):
            reasons.append("Contains potentially dangerous medical advice")
            categories.append("dangerous_advice")
            break
    
    # Check extreme claims
    for pattern in EXTREME_CLAIMS:
        if re.search(pattern, text_lower):
            reasons.append("Makes extreme or absolute claims")
            categories.append("extreme_claim")
            break
    
    # Heuristic: very short posts with extreme sentiment are suspicious
    word_count = len(text.split())
    if word_count < 20:
        has_extreme = any(w in text_lower for w in [
            "amazing", "miracle", "cure", "perfect", "incredible", "unbelievable"
        ])
        if has_extreme:
            reasons.append("Short post with extreme positive claims (possible spam)")
            categories.append("suspicious_spam")
    
    is_flagged = len(reasons) > 0
    confidence = min(0.9, 0.3 * len(reasons)) if is_flagged else 0.0

    # Groq verification for flagged posts
    if is_flagged:
        try:
            from nlp.llm_synthesis import verify_misinformation
            verification = verify_misinformation(text, reasons)
            if verification:
                if not verification.get("confirmed", True):
                    # Groq overturned the flag
                    is_flagged = False
                    reasons = []
                    categories = []
                    confidence = 0.0
                else:
                    explanation = verification.get("explanation", "")
                    if explanation:
                        reasons.append(f"LLM confirmed: {explanation}")
        except Exception:
            pass  # Keep regex result

    return {
        "is_flagged": is_flagged,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "categories": categories,
    }


def detect_batch(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Run misinformation detection on a batch of posts."""
    results = []
    for post in posts:
        text = post.get("text", "") or post.get("full_text", "")
        result = detect_misinformation(text)
        result["post_id"] = post.get("id") or post.get("post_id")
        results.append(result)
    return results
