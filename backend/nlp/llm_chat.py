"""
CuraTrace Chat — RAG-based health information chatbot.
Uses aggregated patient discussion data + Groq LLM for evidence-backed responses.

Key principles:
- Answers are grounded in REAL patient experiences, never creatively generated
- Never diagnoses or recommends specific treatments
- Always encourages consulting healthcare professionals
- Can explain treatment approaches and suggest questions to ask the doctor
"""

import os
from typing import Dict, Any, Optional, List

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are CuraTrace, a health information assistant. You help users understand treatments by summarizing what real patients have shared in online discussions.

You are NOT a doctor. You do NOT diagnose, prescribe, or recommend treatments.

STRICT RULES:
1. ONLY state what the patient data shows. Never invent facts. If data is missing, say "the available discussions don't cover this."
2. Always cite how many discussions were analyzed and from which sources (Reddit, PubMed, Drugs.com, YouTube).
3. Use plain, simple language. Explain medical terms if you use them.
4. When describing findings, say "patients reported...", "some users mentioned...", "according to discussions..."
5. When comparing approaches (allopathy, homeopathy, naturopathy, lifestyle), present each factually without endorsing any.
6. If data shows conflicting experiences, present both sides honestly.
7. At the end of every response, suggest 1-2 useful questions the user can ask their doctor. Frame these based on the data discussed.
8. End with: "This information is sourced from real patient discussions. Always verify with your healthcare provider."
9. NEVER say "I recommend" or "you should take" or "the best treatment is".
10. Keep responses concise and well-structured with markdown.
11. You ONLY answer questions related to health, medicine, diseases, treatments, symptoms, side effects, and medical terminology. If someone asks about anything else (politics, technology, entertainment, etc.), politely decline and say you can only help with health-related questions."""

# ─── Medical topic filter ─────────────────────────────────────────────────────
MEDICAL_KEYWORDS = {
    # Body systems & general medical
    "health", "medical", "medicine", "doctor", "hospital", "clinic", "treatment",
    "therapy", "disease", "condition", "symptom", "diagnosis", "prognosis",
    "prescription", "medication", "drug", "pill", "tablet", "capsule", "dosage",
    "dose", "side effect", "adverse", "reaction", "allergy", "allergic",
    # Pain & symptoms
    "pain", "ache", "fever", "cough", "cold", "flu", "infection", "inflammation",
    "swelling", "rash", "itch", "nausea", "vomit", "diarrhea", "constipation",
    "fatigue", "dizziness", "headache", "migraine", "insomnia", "anxiety",
    "depression", "stress", "bleeding", "wound", "fracture", "sprain",
    # Organs & body parts
    "heart", "lung", "liver", "kidney", "brain", "stomach", "intestine",
    "skin", "bone", "joint", "muscle", "nerve", "blood", "eye", "ear",
    "throat", "nose", "tooth", "dental", "spine", "thyroid",
    # Diseases
    "diabetes", "cancer", "tumor", "asthma", "arthritis", "hypertension",
    "cholesterol", "stroke", "epilepsy", "alzheimer", "parkinson",
    "pneumonia", "bronchitis", "tuberculosis", "malaria", "typhoid",
    "dengue", "covid", "hiv", "aids", "hepatitis", "eczema", "psoriasis",
    "acne", "dandruff", "ulcer", "hernia", "anemia", "obesity",
    # Treatment approaches
    "allopathy", "homeopathy", "naturopathy", "ayurveda", "ayurvedic",
    "herbal", "remedy", "vaccine", "vaccination", "immunization",
    "surgery", "operation", "physiotherapy", "rehabilitation",
    # Lifestyle & wellness
    "diet", "nutrition", "exercise", "yoga", "meditation", "wellness",
    "weight loss", "weight gain", "bmi", "calorie",
    # Lab & testing
    "test", "lab", "x-ray", "mri", "ct scan", "ultrasound", "biopsy",
    "blood test", "urine test",
    # Pharma
    "antibiotic", "paracetamol", "ibuprofen", "aspirin", "metformin",
    "insulin", "steroid", "antidepressant", "painkiller", "vitamin",
    "supplement", "probiotic",
    # Women's health
    "pregnancy", "menstrual", "menopause", "pcos", "pcod", "fertility",
    # Mental health
    "bipolar", "schizophrenia", "ptsd", "ocd", "adhd", "autism",
    # Pediatric
    "child", "pediatric", "infant", "newborn",
    # General medical terms
    "chronic", "acute", "benign", "malignant", "congenital", "hereditary",
    "immunity", "antibody", "antigen", "pathogen", "virus", "bacteria",
    "fungal", "parasite", "contagious", "epidemic", "pandemic",
    "patient", "recovery", "remission", "relapse", "complication",
    "pharmaceutical", "pharmacist", "pharmacy",
}


def _is_medical_query(message: str) -> bool:
    """Check if the user's message is related to health/medicine."""
    msg_lower = message.lower()
    # Check if any medical keyword appears in the message
    for keyword in MEDICAL_KEYWORDS:
        if keyword in msg_lower:
            return True
    return False


NON_MEDICAL_RESPONSE = (
    "I can only assist with health and medical questions. "
    "Please ask me about diseases, treatments, symptoms, side effects, "
    "or medications, and I will provide information based on real patient discussions.\n\n"
    "*Examples of questions I can help with:*\n"
    "- What are the side effects of metformin?\n"
    "- How do patients manage migraine?\n"
    "- What treatment approaches exist for diabetes?\n"
    "- What lifestyle changes help with hypertension?"
)


def _get_client() -> Optional[Any]:
    if not GROQ_AVAILABLE:
        return None
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        return Groq(api_key=api_key)
    except Exception:
        return None


def _score_relevance(post_text: str, query: str) -> float:
    """TF-IDF inspired word-overlap relevance scoring."""
    query_words = set(w for w in query.lower().split() if len(w) > 2)
    post_words = set(post_text.lower().split())
    if not query_words:
        return 0
    overlap = query_words & post_words
    # Bonus for medical terms matching
    return len(overlap) / len(query_words)


def _detect_treatment(message: str, pipeline: Any) -> Optional[str]:
    """
    Detect treatment/disease from the user's message.
    Tries: exact match in cache → case-insensitive match → auto-scrape.
    """
    message_lower = message.lower()

    # 1. Exact match against cached treatments
    for treatment in pipeline.treatments:
        if treatment.lower() in message_lower:
            return treatment

    # 2. Try extracting potential treatment names from the message
    # Remove common question words and check remaining meaningful words
    stop_words = {
        'what', 'are', 'the', 'for', 'how', 'does', 'is', 'can', 'could',
        'would', 'should', 'about', 'tell', 'explain', 'compare', 'between',
        'and', 'with', 'from', 'this', 'that', 'have', 'has', 'been', 'any',
        'side', 'effects', 'treatment', 'treatments', 'options', 'help',
        'work', 'works', 'effective', 'best', 'better', 'worse', 'than',
        'there', 'which', 'when', 'where', 'why', 'who', 'whom',
        'me', 'my', 'your', 'i', 'you', 'we', 'they', 'it', 'do',
        'not', 'but', 'or', 'if', 'of', 'in', 'on', 'at', 'to', 'a', 'an',
        'vs', 'versus', 'difference', 'like', 'know', 'want',
    }

    words = message.replace('?', '').replace('!', '').replace(',', '').split()
    candidates = []
    for i, word in enumerate(words):
        if word.lower() not in stop_words and len(word) > 2:
            candidates.append(word)
        # Also build 2-word phrases
        if i > 0:
            phrase = f"{words[i-1]} {word}"
            phrase_lower_words = set(w.lower() for w in phrase.split())
            if not phrase_lower_words.issubset(stop_words):
                candidates.append(phrase)

    # Try candidates as potential treatment/disease names
    for candidate in candidates:
        # Check if already cached (case-insensitive)
        for cached in pipeline.treatments:
            if candidate.lower() == cached.lower():
                return cached

    # 3. Auto-scrape: try the best candidate
    for candidate in candidates:
        if len(candidate) > 3:
            try:
                result = pipeline.search_treatment(candidate)
                if result:
                    return candidate
            except Exception:
                pass

    return None


def _build_context(data: Dict, message: str) -> str:
    """Build rich context string from aggregated treatment data."""
    parts = []

    parts.append(f"Treatment/Condition: {data.get('treatment', 'Unknown')}")
    parts.append(f"Total patient discussions analyzed: {data.get('total_discussions', 0)}")

    sources = data.get('sources', {}).get('breakdown', {})
    if sources:
        source_counts = ", ".join(f"{k}: {v}" for k, v in sources.items())
        parts.append(f"Data sources: {source_counts}")

    # Side effects
    side_effects = data.get("side_effects", [])
    if side_effects:
        effects_list = ", ".join(
            f"{e['name']} (reported by {e.get('count', 0)} patients, {e.get('percentage', 0)}%)"
            for e in side_effects[:10]
        )
        parts.append(f"\nReported side effects: {effects_list}")

    # Effectiveness
    eff = data.get("effectiveness", {})
    if eff:
        parts.append(f"\nPatient-reported outcomes:")
        parts.append(f"- Positive experiences: {eff.get('positive_reports', 0)} out of {eff.get('total_posts', 0)} ({eff.get('positive_pct', 0)}%)")
        parts.append(f"- Negative experiences: {eff.get('negative_reports', 0)} out of {eff.get('total_posts', 0)} ({eff.get('negative_pct', 0)}%)")
        parts.append(f"- Neutral/informational: {eff.get('neutral_reports', 0)} out of {eff.get('total_posts', 0)} ({eff.get('neutral_pct', 0)}%)")
        parts.append(f"- Overall label: {eff.get('effectiveness_label', 'N/A')}")

    # Sentiment
    sent = data.get("sentiment", {})
    if sent:
        parts.append(f"\nSentiment analysis (VADER NLP):")
        parts.append(f"- Average sentiment score: {sent.get('average_score', 0)} (range: -1 to +1)")
        dist = sent.get("distribution", {})
        parts.append(f"- Positive: {dist.get('positive_pct', 0)}%, Negative: {dist.get('negative_pct', 0)}%, Neutral: {dist.get('neutral_pct', 0)}%")

    # Dosages
    dosages = data.get("dosages", [])
    if dosages:
        dose_list = ", ".join(f"{d['dosage']} (mentioned {d['count']}x)" for d in dosages[:5])
        parts.append(f"\nDosages mentioned by patients: {dose_list}")

    # Combinations
    combos = data.get("combinations", [])
    if combos:
        combo_list = ", ".join(c["name"] for c in combos[:5])
        parts.append(f"\nFrequently co-mentioned treatments: {combo_list}")

    # Approach comparison (if available)
    approach = data.get("approach_comparison")
    if approach and isinstance(approach, list):
        parts.append(f"\nTreatment approach comparison:")
        for a in approach:
            name = a.get("name", "Unknown")
            desc = a.get("description", "")
            parts.append(f"- {name}: {desc[:200]}")

    # Top relevant patient excerpts
    source_posts = data.get("source_posts", [])
    scored = [(p, _score_relevance(p.get("text", ""), message)) for p in source_posts]
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:8]

    if top:
        parts.append(f"\nRelevant patient excerpts (direct quotes):")
        for p, score in top:
            src = p.get("source", "Unknown")
            text = p.get("full_text", p.get("text", ""))[:400]
            parts.append(f'[{src}] "{text}"')

    return "\n".join(parts), top


def llm_chat_query(message: str, pipeline: Any) -> Optional[Dict[str, Any]]:
    """
    RAG chat: detect treatment, build context from patient data, call Groq LLM.
    Returns None if Groq unavailable (caller falls back to keyword chat).
    """
    client = _get_client()
    if not client:
        return None

    # Detect treatment from message
    target_treatment = _detect_treatment(message, pipeline)

    if not target_treatment:
        # General health question — answer without specific data
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": (
                        f"The user asked a general health question. No specific treatment data is available. "
                        f"Answer based on general medical knowledge but remind the user that CuraTrace works best "
                        f"when they search for a specific treatment or disease first. "
                        f"Currently available cached treatments: {', '.join(pipeline.treatments) if pipeline.treatments else 'none yet'}.\n\n"
                        f"User question: {message}"
                    )},
                ],
                temperature=0.3,
                max_tokens=800,
            )
            answer = response.choices[0].message.content.strip()
            return {
                "response": answer,
                "sources": [],
                "treatment": None,
                "total_discussions": 0,
            }
        except Exception as e:
            print(f"[LLMChat] Groq error (general): {e}")
            return None

    # Get aggregated data
    data = pipeline.aggregated_data.get(target_treatment)
    if not data:
        return {
            "response": (
                f"I found the term **{target_treatment}** in your question but don't have patient data for it yet. "
                f"Please search for \"{target_treatment}\" using the search bar first — I'll analyze live patient discussions "
                f"from Reddit, PubMed, Drugs.com, and YouTube. Then come back to chat and I can answer your questions "
                f"backed by real patient experiences."
            ),
            "sources": [],
            "treatment": target_treatment,
            "total_discussions": 0,
        }

    # Build context from real patient data
    context, top_posts = _build_context(data, message)

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": (
                    f"Based on the following REAL aggregated patient discussion data:\n\n"
                    f"{context}\n\n"
                    f"Answer the user's question using ONLY the data above. "
                    f"Do not add information beyond what the data shows. "
                    f"If the data doesn't cover the question, say so.\n\n"
                    f"User question: {message}"
                )},
            ],
            temperature=0.2,
            max_tokens=1200,
        )

        answer = response.choices[0].message.content.strip()

        relevant_sources = [
            {
                "source": p.get("source", ""),
                "text": p.get("text", "")[:150] + "...",
                "url": p.get("url", ""),
            }
            for p, _ in top_posts[:5]
        ]

        return {
            "response": answer,
            "sources": relevant_sources,
            "treatment": target_treatment,
            "total_discussions": data.get("total_discussions", 0),
        }

    except Exception as e:
        print(f"[LLMChat] Groq error: {e}")
        return None
