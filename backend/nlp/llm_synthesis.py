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

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


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
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
        content = content.strip()

        parsed = json.loads(content)
        if isinstance(parsed, list) and len(parsed) >= 4:
            return parsed[:6]

    except Exception:
        pass

    return None


def synthesize_approach_comparison(
    treatment: str,
    category: str,
    effectiveness: Dict,
    side_effects: List[Dict],
    disease_context: Optional[Dict] = None,
) -> Optional[List[Dict]]:
    """
    Compare different treatment approaches by scraping real data for each category.
    Searches web for actual homeopathy, naturopathy, lifestyle approaches and
    uses LLM to synthesize comparison from the scraped evidence.
    """
    client = _get_client()
    if not client:
        return None

    condition = disease_context.get("condition", treatment) if disease_context else treatment
    top_effects = ", ".join(e["name"] for e in side_effects[:5]) if side_effects else "not specified"
    eff_label = effectiveness.get("effectiveness_label", "unknown")

    # Step 1: Scrape real data for each approach category
    approach_queries = {
        "Homeopathy": f"{condition} homeopathy treatment remedies",
        "Naturopathy": f"{condition} natural remedies herbal treatment",
        "Lifestyle": f"{condition} lifestyle changes diet exercise management",
    }

    scraped_data = {}
    try:
        from scrapers.web_scraper import scrape_web
        for approach, query in approach_queries.items():
            try:
                posts = scrape_web(query)
                if posts:
                    # Collect text snippets from scraped results
                    snippets = []
                    for p in posts[:5]:
                        text = p.get("text", "")
                        if text and len(text) > 20:
                            snippets.append(text[:300])
                    if snippets:
                        scraped_data[approach] = snippets
            except Exception as e:
                print(f"[Approach Scrape] {approach} scrape failed: {e}")
    except ImportError:
        print("[Approach Scrape] web_scraper not available, using LLM knowledge only")

    # Step 2: Build prompt with scraped evidence
    evidence_sections = []
    for approach, snippets in scraped_data.items():
        evidence_sections.append(f"\n--- Real scraped data for {approach} ---\n" + "\n".join(f"- {s}" for s in snippets[:3]))

    evidence_text = "\n".join(evidence_sections) if evidence_sections else "No web data was scraped. Use your medical knowledge."

    prompt = f"""For the condition '{condition}', compare 4 treatment approaches using REAL DATA.

Current conventional treatment: '{treatment}' (category: {category}, effectiveness: {eff_label})
Known side effects of conventional treatment: {top_effects}

{evidence_text}

Based on the above real patient data and your medical knowledge, return ONLY a valid JSON array of 4 objects.
Each object must have:
- "approach": exactly one of "Allopathy", "Homeopathy", "Naturopathy", "Lifestyle"
- "treatment_name": specific treatment/remedy name (be specific, not generic)
- "mechanism": 1 sentence how it works
- "common_side_effects": array of 2-3 strings
- "patient_sentiment": "mostly positive", "mixed", or "limited evidence"
- "avg_improvement_time": e.g. "2-4 weeks"
- "details": 2-3 sentences based on REAL evidence where available
- "source_info": brief note on where this info comes from (e.g. "Based on patient reports" or "Based on clinical evidence")

For Allopathy, use '{treatment}' as the treatment. Include real data from the scraped evidence where available.
Return ONLY valid JSON array, no markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a medical comparison expert. You compare treatment approaches using evidence. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1200,
        )

        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
        content = content.strip()

        parsed = json.loads(content)
        if isinstance(parsed, list) and len(parsed) >= 2:
            # Mark which approaches have scraped evidence
            for item in parsed:
                approach = item.get("approach", "")
                if approach in scraped_data:
                    item["has_evidence"] = True
                elif approach == "Allopathy":
                    item["has_evidence"] = True  # We have patient data
                else:
                    item["has_evidence"] = False
            return parsed[:5]
    except Exception as e:
        print(f"[LLM Approach Comparison] Error: {e}")

    return None


def synthesize_sentiment(treatment: str, sentiment_data: Dict, source_posts: List[Dict]) -> Optional[Dict[str, Any]]:
    client = _get_client()
    if not client:
        return None

    # Pick up to 15 posts to base the synthesis on
    texts = [p.get("text", "") for p in source_posts[:15]]
    
    prompt = f"""Analyze the sentiment for patients taking {treatment}.
    
Overall Sentiment Metrics: {json.dumps(sentiment_data)}
Patient excerpts:
{json.dumps(texts)}

Return ONLY a JSON object with this exact schema:
{{
  "summary": "2-3 sentences explaining the overarching patient experience",
  "positive_reasons": ["reason 1", "reason 2"],
  "negative_reasons": ["reason 1", "reason 2"]
}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a medical data analyst. Return only valid JSON matching the exact schema."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=600,
        )

        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
        content = content.strip()

        parsed = json.loads(content)
        if "summary" in parsed and "positive_reasons" in parsed:
            return parsed
    except Exception as e:
        print(f"[LLM Synthesize Sentiment] Error: {e}")
        pass

    return None


def categorize_treatment(treatment: str) -> str:
    """Categorize treatment strictly into one of: Allopathy, Naturopathy, Homeopathy, Lifestyle"""
    client = _get_client()
    if not client:
        return "Allopathy" # Fallback

    prompt = f"""Categorize the medical treatment '{treatment}' into exactly ONE of the following explicitly requested categories:
1. Allopathy (conventional medicine, pharmaceuticals, surgery)
2. Naturopathy (herbal supplements, natural extracts)
3. Homeopathy (highly diluted substances based on 'like cures like')
4. Lifestyle (diet, exercise, meditation, physical therapy)

Return ONLY a JSON object:
{{"category": "category name"}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You categorize treatments strictly. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=50,
        )

        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
        content = content.strip()

        parsed = json.loads(content)
        category = parsed.get("category", "Allopathy")
        if category in ["Allopathy", "Naturopathy", "Homeopathy", "Lifestyle"]:
            return category
    except Exception:
        pass

    return "Allopathy" # Fallback


def synthesize_disease_context(treatment: str, source_posts: List[Dict]) -> Optional[Dict[str, Any]]:
    client = _get_client()
    if not client:
        return None

    texts = [p.get("text", "") for p in source_posts[:15]]
    
    prompt = f"""Based on the following patient discussions about '{treatment}', determine the primary medical condition or disease being treated.
    
Patient excerpts:
{json.dumps(texts)}

Return ONLY a JSON object with this exact schema:
{{
  "condition": "Name of the primary disease/condition (e.g. Type 2 Diabetes, Migraine, Anxiety)",
  "context_summary": "2-3 sentences explaining the disease context based on these discussions",
  "related_treatments_mentioned": ["treatment 1", "treatment 2"]
}}"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a medical data analyst. Return only valid JSON matching the exact schema."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=300,
        )

        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
        content = content.strip()

        parsed = json.loads(content)
        if "condition" in parsed and "context_summary" in parsed:
            return parsed
    except Exception as e:
        print(f"[LLM Synthesize Disease Context] Error: {e}")
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
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1]
        content = content.strip()

        return json.loads(content)

    except Exception:
        pass

    return None
