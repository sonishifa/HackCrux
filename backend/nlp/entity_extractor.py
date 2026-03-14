"""
Medical Entity Extractor — LLM-Primary + Pattern Fallback.
Uses Groq LLM as primary extractor (universal, any treatment).
Pattern matching (SIDE_EFFECTS_KEYWORDS, regex) runs as supplement/fallback.
scispaCy is loaded opportunistically but is NOT the primary path.
"""

import re
from typing import Dict, List, Any

# --- Try loading scispaCy model (opportunistic, not primary) ---
_nlp_model = None
SCISPACY_AVAILABLE = False

try:
    import spacy
    try:
        _nlp_model = spacy.load("en_ner_bc5cdr_md")
        SCISPACY_AVAILABLE = True
        print("[EntityExtractor] scispaCy BC5CDR model loaded ✓ (supplementary NER enabled)")
    except OSError:
        try:
            _nlp_model = spacy.load("en_core_sci_sm")
            SCISPACY_AVAILABLE = True
            print("[EntityExtractor] scispaCy small model loaded ✓ (supplementary NER enabled)")
        except OSError:
            print("[EntityExtractor] No scispaCy model found. Pattern-based extraction only.")
except Exception:
    print("[EntityExtractor] spaCy not available. Pattern-based extraction only.")


# ============================================================
# Supplementary keyword lists (patterns run alongside LLM)
# ============================================================

SIDE_EFFECTS_KEYWORDS = [
    "nausea", "vomiting", "diarrhea", "constipation", "headache", "dizziness",
    "fatigue", "tiredness", "drowsiness", "insomnia", "rash", "itching",
    "stomach pain", "stomach upset", "stomach cramps", "stomach discomfort",
    "stomach issues", "abdominal pain", "bloating", "gas", "heartburn",
    "dry mouth", "dry cough", "cough", "muscle pain", "joint pain",
    "weight gain", "weight loss", "appetite loss", "appetite increase",
    "anxiety", "depression", "mood changes", "irritability",
    "blurred vision", "skin irritation", "bruising", "swelling",
    "hypoglycemia", "low blood sugar", "high blood sugar",
    "allergic reaction", "injection site reactions",
    "metallic taste", "hair loss", "chest pain",
    "shortness of breath", "back pain", "fever", "chills",
    "yeast infection", "lightheaded", "rebound acid",
    "ankle swelling", "injection fatigue",
]

POSITIVE_OUTCOMES = [
    "improved", "improvement", "better", "helped", "effective", "works",
    "worked", "amazing", "excellent", "great", "wonderful", "fantastic",
    "stabilized", "controlled", "normalized", "dropped", "reduced",
    "cured", "resolved", "cleared", "disappeared", "gone", "relief",
    "game changer", "changed my life", "lifesaver", "saved me",
    "well managed", "well controlled", "under control",
]

NEGATIVE_OUTCOMES = [
    "worse", "worsened", "terrible", "awful", "horrible", "unbearable",
    "didn't work", "didn't help", "ineffective", "failed", "no improvement",
    "had to stop", "couldn't handle", "couldn't tolerate", "quit",
    "switched", "stopped taking",
]

TIMELINE_PATTERNS = [
    (r'(?:within|after|by|around|about)\s+(\d+)\s*(day|days|week|weeks|month|months|hour|hours)', 'after'),
    (r'(first|second|third)\s+(day|week|month)', 'during'),
    (r'(week|month|day)\s+(\d+)', 'at'),
    (r'(\d+)\s*-\s*(\d+)\s*(days|weeks|months)', 'range'),
    (r'(\d+)\s*(?:to)\s*(\d+)\s*(days|weeks|months)', 'range'),
    (r'(immediately|right away|instant)', 'immediate'),
]

DOSAGE_PATTERNS = [
    r'(\d+)\s*mg',
    r'(\d+)\s*mcg',
    r'(\d+)\s*ml',
    r'(\d+)\s*units',
]

COMBINATION_KEYWORDS = [
    "exercise", "walking", "running", "yoga", "physical therapy",
    "stretching", "strength training",
    "diet", "dietary changes", "dietary control", "low-carb diet",
    "keto diet", "Mediterranean diet", "DASH diet", "low-salt diet",
    "low sodium", "intermittent fasting",
    "probiotics", "supplements", "vitamin", "B12",
    "meditation", "stress management",
    "weight loss", "lifestyle changes",
]

# Side effect deduplication groups
_DEDUP_GROUPS = {
    "stomach issues": ["stomach pain", "stomach upset", "stomach cramps",
                       "stomach discomfort", "stomach issues", "abdominal pain"],
    "nausea": ["nausea", "vomiting"],
    "fatigue": ["fatigue", "tiredness", "drowsiness"],
    "dizziness": ["dizziness", "lightheaded"],
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
    "weight gain": ["weight gain"],
    "weight loss": ["weight loss"],
    "ankle swelling": ["ankle swelling", "swelling"],
}


# ============================================================
# scispaCy-based extraction (supplementary)
# ============================================================

def _extract_entities_scispacy(text: str) -> Dict[str, List[str]]:
    """
    Use scispaCy NER to supplementarily extract medical entities.
    Returns dict with 'chemicals' and 'diseases'.
    Not primary — used to supplement LLM and pattern results.
    """
    if not SCISPACY_AVAILABLE or _nlp_model is None:
        return {"chemicals": [], "diseases": []}

    doc = _nlp_model(text[:5000])
    chemicals = []
    diseases = []

    for ent in doc.ents:
        entity_text = ent.text.strip().lower()
        if len(entity_text) < 3:
            continue

        if ent.label_ == "CHEMICAL":
            chemicals.append(entity_text)
        elif ent.label_ == "DISEASE":
            diseases.append(entity_text)
        else:
            diseases.append(entity_text)

    return {
        "chemicals": list(set(chemicals)),
        "diseases": list(set(diseases)),
    }


# ============================================================
# Pattern-based extraction (fallback + supplement)
# ============================================================

def extract_side_effects(text: str, ner_diseases: List[str] = None) -> List[str]:
    """Extract side effects using keywords + optional scispaCy diseases."""
    text_lower = text.lower()
    found = set()

    for effect in SIDE_EFFECTS_KEYWORDS:
        if effect in text_lower:
            found.add(effect)

    if ner_diseases:
        for disease in ner_diseases:
            if len(disease) > 3 and disease not in ["type 2 diabetes", "diabetes",
                                                      "type 1 diabetes", "hypertension"]:
                found.add(disease)

    return _deduplicate_side_effects(list(found))


def _deduplicate_side_effects(effects: List[str]) -> List[str]:
    """Remove duplicate/overlapping side effects."""
    result = set()
    matched = set()

    for canonical, variants in _DEDUP_GROUPS.items():
        for v in variants:
            if v in effects and v not in matched:
                result.add(canonical)
                matched.update(variants)
                break

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
                "raw": match.group(0),
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


def extract_combinations(text: str, current_treatment: str, ner_chemicals: List[str] = None) -> List[str]:
    """Extract combination treatments using keywords + scispaCy chemicals."""
    text_lower = text.lower()
    current_lower = current_treatment.lower()
    combinations = set()

    for keyword in COMBINATION_KEYWORDS:
        if keyword.lower() in text_lower and keyword.lower() != current_lower:
            combinations.add(keyword.title())

    if ner_chemicals:
        for chem in ner_chemicals:
            if chem.lower() != current_lower and len(chem) > 2:
                combinations.add(chem.title())

    return list(combinations)


# ============================================================
# Main extraction entry point
# ============================================================

def extract_entities(post: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract all medical entities from a single post.
    Pattern matching + optional scispaCy supplement.
    LLM extraction is handled at batch level in process_all_posts().
    """
    text = post.get("text", "")
    treatment = post.get("treatment", "")

    # scispaCy supplement (if available)
    ner_entities = _extract_entities_scispacy(text)

    return {
        "post_id": post.get("id"),
        "source": post.get("source", ""),
        "treatment": treatment,
        "text": text,
        "timestamp": post.get("timestamp", ""),
        "url": post.get("url", ""),
        "side_effects": extract_side_effects(text, ner_entities.get("diseases")),
        "outcomes": extract_outcomes(text),
        "timelines": extract_timelines(text),
        "dosages": extract_dosages(text),
        "combinations": extract_combinations(text, treatment, ner_entities.get("chemicals")),
        "ner_entities": ner_entities,
        "video_title": post.get("video_title"),
        "rating": post.get("rating"),
    }


def process_all_posts(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Process all posts.
    Step 1: Try Groq LLM extraction (primary — universal, any treatment).
    Step 2: Merge with pattern-based results (supplement + fallback).
    """
    if not posts:
        return []

    treatment = posts[0].get("treatment", "") if posts else ""

    # ── Step 1: LLM extraction (primary) ──────────────────────
    llm_results = []
    llm_succeeded = False
    try:
        from nlp.llm_extractor import extract_entities_llm, is_available
        if is_available():
            llm_results = extract_entities_llm(posts, treatment)
            llm_succeeded = bool(llm_results and any(llm_results))
            if llm_succeeded:
                print(f"[EntityExtractor] LLM extraction complete ✓ ({len(posts)} posts)")
    except Exception as e:
        print(f"[EntityExtractor] LLM extraction failed, falling back to patterns: {e}")

    # ── Step 2: Pattern-based extraction (always runs as supplement/fallback) ──
    pattern_results = []
    for post in posts:
        extracted = extract_entities(post)
        pattern_results.append(extracted)

    # ── Step 3: Merge — LLM is primary, patterns fill gaps ────
    results = []
    for i, pattern_data in enumerate(pattern_results):
        llm_data = llm_results[i] if i < len(llm_results) else {}

        if not llm_data:
            # LLM had nothing for this post — use patterns as-is
            results.append(pattern_data)
            continue

        # Merge side effects (union, deduplicated)
        llm_effects = [e for e in llm_data.get("side_effects", []) if isinstance(e, str) and len(e) > 2]
        merged_effects = set(pattern_data["side_effects"])
        for effect in llm_effects:
            merged_effects.add(effect.lower())
        pattern_data["side_effects"] = _deduplicate_side_effects(list(merged_effects))

        # Merge dosages (union)
        llm_doses = [d for d in llm_data.get("dosages", []) if isinstance(d, str)]
        merged_doses = set(pattern_data["dosages"])
        merged_doses.update(llm_doses)
        pattern_data["dosages"] = list(merged_doses)

        # Merge combinations (union)
        llm_combos = [c for c in llm_data.get("combinations", []) if isinstance(c, str) and len(c) > 2]
        merged_combos = set(pattern_data["combinations"])
        merged_combos.update(llm_combos)
        pattern_data["combinations"] = list(merged_combos)

        # LLM outcome overrides pattern (LLM is more accurate)
        llm_outcome = llm_data.get("outcome", "")
        if llm_outcome in ("positive", "negative", "neutral"):
            pattern_data["outcomes"] = {
                "positive": llm_outcome == "positive",
                "negative": llm_outcome == "negative",
            }

        results.append(pattern_data)

    return results
