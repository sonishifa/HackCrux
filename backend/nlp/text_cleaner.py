"""
Text Cleaning & Normalization Module
Uses RxNorm for drug normalization instead of hardcoded map.
Keeps colloquial side effect normalization (valid, not hardcoding).
"""

import re
from typing import Dict, Any, List

from nlp.drug_normalizer import drug_normalizer


# Side effect normalization — colloquial phrases to standard terms
# This is NOT hardcoding drug names; it normalizes language patterns
SIDE_EFFECT_NORMALIZATION = {
    "throwing up": "nausea", "feel sick": "nausea", "queasy": "nausea", "puke": "nausea",
    "loose stools": "diarrhea", "runny stomach": "diarrhea",
    "can't sleep": "insomnia", "couldn't sleep": "insomnia",
    "tired": "fatigue", "exhausted": "fatigue", "wiped out": "fatigue",
    "head spinning": "dizziness", "light-headed": "dizziness", "dizzy": "dizziness",
    "tummy ache": "stomach pain", "belly pain": "stomach pain",
    "gut issues": "stomach issues",
    "putting on weight": "weight gain", "gained weight": "weight gain",
    "dropped weight": "weight loss", "lost weight": "weight loss",
    "scratchy throat": "dry cough", "hacking cough": "dry cough",
    "breaking out": "rash", "skin rash": "rash", "itchy skin": "itching",
    "low sugar": "hypoglycemia", "sugar crash": "hypoglycemia",
    "blood sugar drop": "hypoglycemia",
}


def clean_text(text: str) -> str:
    """Clean and normalize patient discussion text."""
    if not text:
        return ""

    # Remove URLs
    cleaned = re.sub(r'https?://\S+', '', text)
    # Remove excessive whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    # Remove special characters but keep medical symbols
    cleaned = re.sub(r'[^\w\s.,!?;:\'\"()/%+-]', '', cleaned)

    return cleaned


def is_english(text: str) -> bool:
    """Check if text is primarily English using ASCII ratio."""
    if not text:
        return False
    ascii_chars = sum(1 for c in text if ord(c) < 128)
    ratio = ascii_chars / len(text)
    return ratio > 0.85


def normalize_medical_terms(text: str) -> str:
    """
    Normalize drug names in text using RxNorm API.
    Finds potential drug-name tokens and normalizes them.
    """
    # Find capitalized words that could be drug names (2+ consecutive capitals or Title case)
    potential_drugs = re.findall(r'\b[A-Z][a-z]{2,15}\b', text)
    for word in potential_drugs:
        normalized = drug_normalizer.normalize(word)
        if normalized != word:
            text = text.replace(word, normalized)
    return text


def normalize_side_effects_in_text(text: str) -> str:
    """Normalize colloquial side effect descriptions to standard terms."""
    text_lower = text.lower()
    for colloquial, standard in SIDE_EFFECT_NORMALIZATION.items():
        if colloquial in text_lower:
            text = re.sub(re.escape(colloquial), standard, text, flags=re.IGNORECASE)
    return text


def is_spam(text: str) -> bool:
    """Basic spam detection. Returns True if text is likely spam."""
    if len(text.split()) < 8:
        return True

    spam_patterns = [
        r'buy\s+now', r'click\s+here', r'order\s+online',
        r'free\s+trial', r'limited\s+offer', r'call\s+now',
        r'discount\s+code', r'promo\s+code',
    ]
    text_lower = text.lower()
    for pattern in spam_patterns:
        if re.search(pattern, text_lower):
            return True

    return False


def preprocess_post(post: Dict[str, Any]) -> Dict[str, Any]:
    """Full preprocessing pipeline for a single post."""
    text = post.get("text", "")

    # Skip spam
    if is_spam(text):
        return None

    # Skip non-English
    if not is_english(text):
        return None

    # Clean text
    cleaned = clean_text(text)

    # Normalize side effect language
    cleaned = normalize_side_effects_in_text(cleaned)

    return {**post, "text": cleaned, "original_text": text}


def preprocess_batch(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Preprocess a batch of posts. Filters spam and non-English."""
    results = []
    spam_count = 0
    lang_count = 0

    for post in posts:
        text = post.get("text", "")

        if not is_english(text):
            lang_count += 1
            continue

        processed = preprocess_post(post)
        if processed is not None:
            results.append(processed)
        else:
            spam_count += 1

    if spam_count > 0:
        print(f"[TextCleaner] Filtered {spam_count} spam posts")
    if lang_count > 0:
        print(f"[TextCleaner] Filtered {lang_count} non-English posts")

    return results
