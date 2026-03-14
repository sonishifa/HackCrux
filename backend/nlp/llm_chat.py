"""
Groq LLM Chat — RAG-based conversational AI for treatment queries.
Uses aggregated data + top source posts as context for Groq.
"""

import os
from typing import Dict, Any, Optional, List

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

GROQ_MODEL = "llama-3.1-70b-versatile"

SYSTEM_PROMPT = """You are CureTrace, a medical data analyst assistant. You analyze aggregated patient discussions to provide treatment insights.

Rules:
- Only make claims supported by the provided patient data
- Always mention the number of discussions analyzed
- Cite sources when possible (Reddit, PubMed, Drugs.com, YouTube)
- If PubMed data is available, highlight clinical evidence
- Always recommend consulting a healthcare professional
- Be concise but comprehensive
- Use markdown formatting for readability"""


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
    """Simple word-overlap relevance scoring."""
    query_words = set(query.lower().split())
    post_words = set(post_text.lower().split())
    if not query_words:
        return 0
    overlap = query_words & post_words
    return len(overlap) / len(query_words)


def llm_chat_query(message: str, pipeline: Any) -> Optional[Dict[str, Any]]:
    """
    RAG chat: find treatment, gather context, call Groq.
    Returns None if Groq unavailable (caller falls back to keyword chat).
    """
    client = _get_client()
    if not client:
        return None

    message_lower = message.lower()

    # Identify treatment
    target_treatment = None
    for treatment in pipeline.treatments:
        if treatment.lower() in message_lower:
            target_treatment = treatment
            break

    # If no cached treatment found, try to find capitalized words as treatment names
    if not target_treatment:
        words = message.split()
        for word in words:
            if len(word) > 3 and word[0].isupper():
                result = pipeline.search_treatment(word)
                if result:
                    target_treatment = word
                    break

    if not target_treatment:
        return {
            "response": (
                f"I can help with treatment information. "
                f"Currently cached: {', '.join(pipeline.treatments) if pipeline.treatments else 'none yet'}. "
                f"Try asking about a specific treatment name (e.g., 'What are the side effects of Metformin?')"
            ),
            "sources": [],
            "treatment": None,
        }

    data = pipeline.aggregated_data.get(target_treatment)
    if not data:
        return None  # Let caller handle

    # Build context from aggregated data
    context_parts = []

    # Stats summary
    context_parts.append(f"Treatment: {target_treatment}")
    context_parts.append(f"Total discussions analyzed: {data['total_discussions']}")
    context_parts.append(f"Sources: {', '.join(data.get('sources', {}).get('breakdown', {}).keys())}")

    # Side effects
    if data.get("side_effects"):
        effects = ", ".join(f"{e['name']} ({e['percentage']}%)" for e in data["side_effects"][:8])
        context_parts.append(f"Top side effects: {effects}")

    # Effectiveness
    eff = data.get("effectiveness", {})
    context_parts.append(f"Effectiveness: {eff.get('effectiveness_label', 'N/A')} ({eff.get('positive_pct', 0)}% positive)")

    # Sentiment
    sent = data.get("sentiment", {})
    context_parts.append(f"Sentiment: avg score {sent.get('average_score', 0)}")

    # Combinations
    if data.get("combinations"):
        combos = ", ".join(c["name"] for c in data["combinations"][:5])
        context_parts.append(f"Common combinations: {combos}")

    # PubMed evidence
    pubmed = data.get("pubmed_evidence")
    if pubmed and pubmed.get("studies_count", 0) > 0:
        context_parts.append(f"\nPubMed clinical evidence ({pubmed['studies_count']} studies):")
        if pubmed.get("confirmed_side_effects"):
            context_parts.append(f"Clinically confirmed side effects: {', '.join(pubmed['confirmed_side_effects'][:10])}")
        if pubmed.get("top_studies"):
            for s in pubmed["top_studies"][:3]:
                context_parts.append(f"- Study: {s['title']} ({s.get('journal', 'N/A')}, {s.get('year', 'N/A')})")

    # Top relevant source posts
    source_posts = data.get("source_posts", [])
    scored = [(p, _score_relevance(p.get("text", ""), message)) for p in source_posts]
    scored.sort(key=lambda x: x[1], reverse=True)
    top_posts = list(scored[:8])

    if top_posts:
        context_parts.append("\nRelevant patient excerpts:")
        for p, score in top_posts:
            src = p.get("source", "Unknown")
            text = p.get("full_text", p.get("text", ""))[:300]
            context_parts.append(f"[{src}] {text}")

    context = "\n".join(context_parts)

    # Call Groq
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Based on this aggregated patient data:\n\n{context}\n\nUser question: {message}"},
            ],
            temperature=0.3,
            max_tokens=1500,
        )

        answer = response.choices[0].message.content.strip()

        relevant_sources = [
            {"source": p.get("source", ""), "text": p.get("text", "")[:150] + "...", "url": p.get("url", "")}
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
        return None  # Fall back to keyword chat
