"""
Groq LLM Synthesis — Treatment-specific timelines and misinfo verification.
"""

import os
import json
from typing import Dict, Any, List, Optional

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

GROQ_MODEL = "llama-3.1-70b-versatile"


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


def synthesize_recovery_timeline(
    treatment: str,
    temporal_data: Dict,
    side_effects: List[Dict],
    sentiment_score: float
) -> Optional[List[Dict]]:
    """
    Generate treatment-specific recovery timeline using Groq.
    Returns 6-phase list matching {phase, title, description, type, mentions} schema.
    Returns None on failure (caller uses static fallback).
    """
    client = _get_client()
    if not client:
        return None

    # Build context
    top_effects = ", ".join(e["name"] for e in side_effects[:5]) if side_effects else "not specified"
    sentiment_label = "positive" if sentiment_score > 0.1 else "neutral" if sentiment_score > -0.1 else "negative"

    prompt = f"""Generate a realistic 6-phase recovery timeline for patients taking {treatment}.

Known data:
- Top side effects: {top_effects}
- Overall patient sentiment: {sentiment_label} (score: {sentiment_score})
- Temporal mentions from patient posts: {json.dumps(temporal_data)}

Return ONLY a JSON array of exactly 6 objects with this schema:
{{"phase": "Week 1", "title": "...", "description": "...", "type": "warning|neutral|positive|success", "mentions": 0}}

Phases should cover: Week 1, Week 2, Week 3, Month 1, Month 2, Month 3+
Descriptions must be specific to {treatment}, not generic. Reference actual side effects.
JSON:"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You generate treatment-specific recovery timelines. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1000,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        parsed = json.loads(content)
        if isinstance(parsed, list) and len(parsed) >= 4:
            return parsed[:6]

    except Exception:
        pass

    return None


def verify_misinformation(text: str, reasons: List[str]) -> Optional[Dict[str, Any]]:
    """
    Verify a flagged post using Groq.
    Returns {confirmed: bool, explanation: str} or None on failure.
    """
    client = _get_client()
    if not client:
        return None

    prompt = f"""A health information system flagged this patient post for potential misinformation.

Post: "{text[:500]}"

Flagged reasons: {', '.join(reasons)}

Is this actually misinformation? Consider:
1. Is the medical claim dangerous or provably false?
2. Could it be a legitimate personal experience?
3. Does it encourage skipping prescribed treatment?

Respond with ONLY JSON: {{"confirmed": true/false, "explanation": "brief reason"}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You verify medical misinformation claims. Be conservative — only confirm if clearly dangerous or false."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=200,
        )

        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        return json.loads(content)

    except Exception:
        pass

    return None
