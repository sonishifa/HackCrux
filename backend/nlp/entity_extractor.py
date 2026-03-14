"""
Medical Entity Extractor
Extracts treatments, side effects, dosages, timelines, outcomes, and combinations
from patient discussion text using pattern matching and keyword dictionaries.
"""

import re
from typing import Dict, List, Any


# Common side effects dictionary
SIDE_EFFECTS = [
    "nausea", "vomiting", "diarrhea", "constipation", "headache", "dizziness",
    "fatigue", "tiredness", "drowsiness", "insomnia", "rash", "itching",
    "stomach pain", "stomach upset", "stomach cramps", "stomach discomfort",
    "stomach issues", "stomach irritation", "stomach sensitivity",
    "abdominal pain", "bloating", "gas", "heartburn",
    "dry mouth", "dry cough", "cough", "muscle pain", "joint pain",
    "weight gain", "weight loss", "appetite loss", "appetite increase",
    "anxiety", "depression", "mood changes", "irritability",
    "blurred vision", "skin irritation", "bruising", "swelling",
    "hypoglycemia", "low blood sugar", "high blood sugar",
    "allergic reaction", "injection site reactions",
    "metallic taste", "hair loss", "chest pain",
    "shortness of breath", "back pain", "fever", "chills",
    "yeast infection", "lightheaded", "rebound acid",
    "ankle swelling", "injection fatigue"
]

# Outcome keywords
POSITIVE_OUTCOMES = [
    "improved", "improvement", "better", "helped", "effective", "works",
    "worked", "amazing", "excellent", "great", "wonderful", "fantastic",
    "stabilized", "controlled", "normalized", "dropped", "reduced",
    "cured", "resolved", "cleared", "disappeared", "gone", "relief",
    "game changer", "changed my life", "lifesaver", "saved me",
    "well managed", "well controlled", "under control"
]

NEGATIVE_OUTCOMES = [
    "worse", "worsened", "terrible", "awful", "horrible", "unbearable",
    "didn't work", "didn't help", "ineffective", "failed", "no improvement",
    "had to stop", "couldn't handle", "couldn't tolerate", "quit",
    "switched", "stopped taking"
]

# Timeline patterns
TIMELINE_PATTERNS = [
    (r'(?:within|after|by|around|about)\s+(\d+)\s*(day|days|week|weeks|month|months|hour|hours)', 'after'),
    (r'(first|second|third)\s+(day|week|month)', 'during'),
    (r'(week|month|day)\s+(\d+)', 'at'),
    (r'(\d+)\s*-\s*(\d+)\s*(days|weeks|months)', 'range'),
    (r'(\d+)\s*(?:to)\s*(\d+)\s*(days|weeks|months)', 'range'),
    (r'(immediately|right away|instant)', 'immediate'),
]

# Dosage patterns
DOSAGE_PATTERNS = [
    r'(\d+)\s*mg',
    r'(\d+)\s*mcg',
    r'(\d+)\s*ml',
    r'(\d+)\s*units',
]

# Combination treatment keywords
COMBINATION_KEYWORDS = [
    "exercise", "walking", "running", "yoga", "physical therapy",
    "stretching", "strength training",
    "diet", "dietary changes", "dietary control", "low-carb diet",
    "keto diet", "Mediterranean diet", "DASH diet", "low-salt diet",
    "low sodium", "intermittent fasting",
    "probiotics", "supplements", "vitamin", "B12",
    "meditation", "stress management",
    "weight loss", "lifestyle changes",
    "insulin", "metformin", "lisinopril", "omeprazole", "ibuprofen",
    "amoxicillin", "acetaminophen", "amlodipine", "losartan",
    "azithromycin", "berberine",
]


def extract_side_effects(text: str) -> List[str]:
    """Extract mentioned side effects from text."""
    text_lower = text.lower()
    found = []
    for effect in SIDE_EFFECTS:
        if effect in text_lower:
            found.append(effect)
    # Deduplicate related terms
    dedup = _deduplicate_side_effects(found)
    return dedup


def _deduplicate_side_effects(effects: List[str]) -> List[str]:
    """Remove duplicate/overlapping side effects."""
    groups = {
        "stomach issues": ["stomach pain", "stomach upset", "stomach cramps",
                          "stomach discomfort", "stomach issues", "stomach irritation",
                          "stomach sensitivity"],
        "nausea": ["nausea", "vomiting"],
        "fatigue": ["fatigue", "tiredness", "drowsiness"],
        "dizziness": ["dizziness", "lightheaded"],
        "weight gain": ["weight gain"],
        "weight loss": ["weight loss"],
        "diarrhea": ["diarrhea"],
        "constipation": ["constipation"],
        "headache": ["headache"],
        "dry cough": ["dry cough", "cough"],
        "rash": ["rash", "itching", "skin irritation"],
        "bloating": ["bloating", "gas"],
        "heartburn": ["heartburn"],
        "hypoglycemia": ["hypoglycemia", "low blood sugar"],
        "muscle pain": ["muscle pain"],
        "joint pain": ["joint pain"],
        "metallic taste": ["metallic taste"],
        "injection site reactions": ["injection site reactions", "bruising"],
        "ankle swelling": ["ankle swelling", "swelling"],
        "allergic reaction": ["allergic reaction"],
        "yeast infection": ["yeast infection"],
    }

    result = set()
    matched = set()
    for canonical, variants in groups.items():
        for v in variants:
            if v in effects and v not in matched:
                result.add(canonical)
                matched.update(variants)
                break

    # Add remaining unmatched
    for e in effects:
        if e not in matched:
            result.add(e)

    return list(result)


def extract_outcomes(text: str) -> Dict[str, bool]:
    """Determine positive/negative outcomes from text."""
    text_lower = text.lower()
    positive = any(kw in text_lower for kw in POSITIVE_OUTCOMES)
    negative = any(kw in text_lower for kw in NEGATIVE_OUTCOMES)
    return {"positive": positive, "negative": negative}


def extract_timelines(text: str) -> List[Dict[str, str]]:
    """Extract temporal references from text."""
    timelines = []
    text_lower = text.lower()

    for pattern, ttype in TIMELINE_PATTERNS:
        matches = re.finditer(pattern, text_lower)
        for match in matches:
            timelines.append({
                "type": ttype,
                "text": match.group(0),
                "raw": match.group(0)
            })

    return timelines


def extract_dosages(text: str) -> List[str]:
    """Extract medication dosages from text."""
    dosages = []
    for pattern in DOSAGE_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            dosages.append(match.group(0))
    return dosages


def extract_combinations(text: str, current_treatment: str) -> List[str]:
    """Extract combination treatments mentioned alongside the current treatment."""
    text_lower = text.lower()
    current_lower = current_treatment.lower()
    combinations = []

    for keyword in COMBINATION_KEYWORDS:
        if keyword.lower() in text_lower and keyword.lower() != current_lower:
            # Don't include the current treatment as a combination
            combinations.append(keyword.title())

    return list(set(combinations))


def extract_entities(post: Dict[str, Any]) -> Dict[str, Any]:
    """Extract all medical entities from a single post."""
    text = post.get("text", "")
    treatment = post.get("treatment", "")

    return {
        "post_id": post.get("id"),
        "source": post.get("source", ""),
        "treatment": treatment,
        "text": text,
        "timestamp": post.get("timestamp", ""),
        "url": post.get("url", ""),
        "side_effects": extract_side_effects(text),
        "outcomes": extract_outcomes(text),
        "timelines": extract_timelines(text),
        "dosages": extract_dosages(text),
        "combinations": extract_combinations(text, treatment),
    }


def process_all_posts(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process all posts and extract entities from each."""
    results = []
    for post in posts:
        extracted = extract_entities(post)
        results.append(extracted)
    return results
