"""
Groq-Powered Entity Extraction — Universal NER for any treatment.
Batches posts and uses Llama 3.1 70B for structured extraction.
Falls back gracefully if Groq unavailable.
"""

import os
import json
from typing import List, Dict, Any, Optional

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

GROQ_MODEL = "llama-3.1-70b-versatile"
BATCH_SIZE = 8


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


def extract_entities_llm(posts: List[Dict], treatment: str) -> List[Dict]:
    """
    Extract entities from posts using Groq LLM.
    Returns list of dicts with: side_effects, dosages, combinations, outcome, temporal_refs.
    """
    client = _get_client()
    if not client:
        return [{} for _ in posts]

    results = []

    # Process in batches
    for i in range(0, len(posts), BATCH_SIZE):
        batch = posts[i:i + BATCH_SIZE]
        batch_results = _extract_batch(client, batch, treatment)
        results.extend(batch_results)

    return results


def _extract_batch(client: Any, posts: List[Dict], treatment: str) -> List[Dict]:
    """Extract entities from a batch of posts."""
    # Build numbered post list
    post_texts = []
    for idx, p in enumerate(posts):
        text = p.get("text", "")[:500]
        post_texts.append(f"Post {idx + 1}: {text}")

    posts_block = "\n\n".join(post_texts)

    prompt = f"""Analyze these patient posts about {treatment}. For EACH post, extract:
- side_effects: list of side effects mentioned
- dosages: list of dosage amounts (e.g., "500mg", "10mg daily")
- combinations: other treatments mentioned alongside {treatment}
- outcome: "positive", "negative", or "neutral"
- temporal_refs: time references (e.g., "week 1", "after 3 months")

Return ONLY valid JSON array with one object per post. No explanation.

{posts_block}

JSON:"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You extract structured medical data from patient posts. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=2000,
        )

        content = response.choices[0].message.content.strip()

        # Parse JSON — handle possible markdown wrapping
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        parsed = json.loads(content)

        if isinstance(parsed, list):
            # Pad or trim to match input length
            while len(parsed) < len(posts):
                parsed.append({})
            return parsed[:len(posts)]

    except Exception:
        pass

    return [{} for _ in posts]


def is_available() -> bool:
    """Check if Groq LLM extraction is available."""
    return _get_client() is not None
