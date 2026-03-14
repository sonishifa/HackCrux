"""
Aggregation Module
Aggregates extracted entities across all posts to produce treatment-level intelligence.
"""

from typing import Dict, List, Any
from collections import Counter, defaultdict


def aggregate_treatment_data(
    extracted_posts: List[Dict[str, Any]],
    sentiment_results: List[Dict[str, Any]],
    treatment: str
) -> Dict[str, Any]:
    """
    Aggregate all extracted data for a specific treatment.
    Returns structured treatment intelligence.
    """
    # Filter posts for this treatment
    treatment_lower = treatment.lower()
    treatment_posts = []
    treatment_sentiments = []

    for i, post in enumerate(extracted_posts):
        if post["treatment"].lower() == treatment_lower:
            treatment_posts.append(post)
            treatment_sentiments.append(sentiment_results[i])

    if not treatment_posts:
        return None

    total_posts = len(treatment_posts)

    # Aggregate side effects
    side_effect_counter = Counter()
    for post in treatment_posts:
        for effect in post["side_effects"]:
            side_effect_counter[effect] += 1

    side_effects = [
        {
            "name": effect,
            "count": count,
            "percentage": round((count / total_posts) * 100, 1)
        }
        for effect, count in side_effect_counter.most_common(15)
    ]

    # Aggregate sentiment
    sentiment_counts = Counter(s["label"] for s in treatment_sentiments)
    avg_score = round(
        sum(s["score"] for s in treatment_sentiments) / len(treatment_sentiments), 3
    )
    sentiment = {
        "positive": sentiment_counts.get("positive", 0),
        "negative": sentiment_counts.get("negative", 0),
        "neutral": sentiment_counts.get("neutral", 0),
        "average_score": avg_score,
        "total": total_posts,
        "distribution": {
            "positive_pct": round(sentiment_counts.get("positive", 0) / total_posts * 100, 1),
            "negative_pct": round(sentiment_counts.get("negative", 0) / total_posts * 100, 1),
            "neutral_pct": round(sentiment_counts.get("neutral", 0) / total_posts * 100, 1),
        }
    }

    # Aggregate outcomes
    positive_outcomes = sum(1 for p in treatment_posts if p["outcomes"]["positive"])
    negative_outcomes = sum(1 for p in treatment_posts if p["outcomes"]["negative"])
    effectiveness = {
        "positive_reports": positive_outcomes,
        "negative_reports": negative_outcomes,
        "positive_pct": round(positive_outcomes / total_posts * 100, 1),
        "negative_pct": round(negative_outcomes / total_posts * 100, 1),
        "effectiveness_label": _effectiveness_label(positive_outcomes, negative_outcomes, total_posts)
    }

    # Aggregate combinations
    combination_counter = Counter()
    for post in treatment_posts:
        for combo in post["combinations"]:
            combo_lower = combo.lower()
            if combo_lower != treatment_lower:
                combination_counter[combo] += 1

    combinations = [
        {"name": combo, "count": count}
        for combo, count in combination_counter.most_common(10)
        if count >= 1
    ]

    # Aggregate dosages
    dosage_counter = Counter()
    for post in treatment_posts:
        for dose in post["dosages"]:
            dosage_counter[dose] += 1

    dosages = [
        {"dosage": dose, "count": count}
        for dose, count in dosage_counter.most_common(5)
    ]

    # Build recovery timeline
    recovery_timeline = _build_recovery_timeline(treatment_posts)

    # Source breakdown
    source_counter = Counter(p["source"] for p in treatment_posts)
    sources = {
        "breakdown": dict(source_counter),
        "total_posts": total_posts
    }

    # Source posts for traceability
    source_posts = [
        {
            "id": p["post_id"],
            "source": p["source"],
            "text": p["text"][:200] + "..." if len(p["text"]) > 200 else p["text"],
            "full_text": p["text"],
            "timestamp": p["timestamp"],
            "url": p["url"],
            "sentiment": treatment_sentiments[i]["label"],
            "side_effects": p["side_effects"]
        }
        for i, p in enumerate(treatment_posts)
    ]

    return {
        "treatment": treatment,
        "total_discussions": total_posts,
        "side_effects": side_effects,
        "sentiment": sentiment,
        "effectiveness": effectiveness,
        "combinations": combinations,
        "dosages": dosages,
        "recovery_timeline": recovery_timeline,
        "sources": sources,
        "source_posts": source_posts
    }


def _effectiveness_label(positive: int, negative: int, total: int) -> str:
    """Generate a human-readable effectiveness label."""
    positive_rate = positive / total if total > 0 else 0
    if positive_rate >= 0.7:
        return "Highly Effective"
    elif positive_rate >= 0.5:
        return "Moderately Effective"
    elif positive_rate >= 0.3:
        return "Mixed Results"
    else:
        return "Limited Effectiveness"


def _build_recovery_timeline(posts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build a generalized recovery timeline from aggregated posts."""
    # Analyze common patterns from timeline extractions and text
    timeline_phases = []
    side_effect_mentions = Counter()
    improvement_mentions = Counter()

    for post in posts:
        text_lower = post["text"].lower()
        
        # Check for week-based patterns
        if any(w in text_lower for w in ["first week", "week 1", "week one", "first few days"]):
            side_effect_mentions["Week 1"] += 1
        if any(w in text_lower for w in ["week 2", "week two", "second week", "2 weeks"]):
            if any(w in text_lower for w in ["better", "improved", "less", "reduced", "subsid"]):
                improvement_mentions["Week 2"] += 1
            else:
                side_effect_mentions["Week 2"] += 1
        if any(w in text_lower for w in ["week 3", "week three", "third week", "3 weeks"]):
            improvement_mentions["Week 3"] += 1
        if any(w in text_lower for w in ["month 1", "month one", "first month", "4 weeks", "week 4"]):
            improvement_mentions["Month 1"] += 1
        if any(w in text_lower for w in ["month 2", "2 months", "two months"]):
            improvement_mentions["Month 2"] += 1
        if any(w in text_lower for w in ["month 3", "3 months", "three months"]):
            improvement_mentions["Month 3"] += 1

    # Build phases
    phases = [
        {
            "phase": "Week 1",
            "title": "Initial Side Effects",
            "description": "Most patients report onset of side effects. Common symptoms appear during this period.",
            "type": "warning",
            "mentions": side_effect_mentions.get("Week 1", 0)
        },
        {
            "phase": "Week 2",
            "title": "Adjustment Period",
            "description": "Side effects begin to reduce for most patients. Body starts adjusting to medication.",
            "type": "neutral",
            "mentions": max(side_effect_mentions.get("Week 2", 0), improvement_mentions.get("Week 2", 0))
        },
        {
            "phase": "Week 3",
            "title": "Improvement Begins",
            "description": "Majority of patients report improvement in symptoms. Side effects significantly reduced.",
            "type": "positive",
            "mentions": improvement_mentions.get("Week 3", 0)
        },
        {
            "phase": "Month 1",
            "title": "Stabilization",
            "description": "Treatment effects stabilize. Most side effects have resolved. Measurable health improvements.",
            "type": "positive",
            "mentions": improvement_mentions.get("Month 1", 0)
        },
        {
            "phase": "Month 2",
            "title": "Full Benefit",
            "description": "Patients report sustained improvement. Treatment outcomes are clearly visible.",
            "type": "success",
            "mentions": improvement_mentions.get("Month 2", 0)
        },
        {
            "phase": "Month 3+",
            "title": "Long-term Management",
            "description": "Treatment becomes routine. Ongoing monitoring and lifestyle adjustments recommended.",
            "type": "success",
            "mentions": improvement_mentions.get("Month 3", 0)
        }
    ]

    return phases


def get_all_treatments(extracted_posts: List[Dict[str, Any]]) -> List[str]:
    """Get list of all unique treatments in the dataset."""
    treatments = set()
    for post in extracted_posts:
        treatments.add(post["treatment"])
    return sorted(list(treatments))


def compare_treatments(
    aggregated_data: Dict[str, Dict[str, Any]],
    treatment_names: List[str]
) -> List[Dict[str, Any]]:
    """Compare multiple treatments side by side."""
    comparison = []
    for name in treatment_names:
        data = aggregated_data.get(name)
        if data:
            comparison.append({
                "treatment": name,
                "total_discussions": data["total_discussions"],
                "top_side_effects": data["side_effects"][:5],
                "sentiment": data["sentiment"],
                "effectiveness": data["effectiveness"],
                "top_combinations": data["combinations"][:3],
            })
    return comparison
