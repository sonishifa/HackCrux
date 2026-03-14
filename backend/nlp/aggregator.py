"""
Aggregation Module
Aggregates extracted entities across all posts to produce treatment-level intelligence.
Includes credibility scoring, misinformation detection, and combination source tracing.
"""

from typing import Dict, List, Any, Optional
from collections import Counter, defaultdict


def aggregate_treatment_data(
    extracted_posts: List[Dict[str, Any]],
    sentiment_results: List[Dict[str, Any]],
    credibility_results: List[Dict[str, Any]],
    misinfo_results: List[Dict[str, Any]],
    treatment: str,
    pubmed_data: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Aggregate all extracted data for a specific treatment.
    Returns structured treatment intelligence.
    """
    treatment_lower = treatment.lower()
    treatment_posts = []
    treatment_sentiments = []
    treatment_credibility = []
    treatment_misinfo = []

    for i, post in enumerate(extracted_posts):
        if post["treatment"].lower() == treatment_lower:
            treatment_posts.append(post)
            treatment_sentiments.append(sentiment_results[i])
            treatment_credibility.append(credibility_results[i])
            treatment_misinfo.append(misinfo_results[i])

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

    # Aggregate combinations WITH source evidence
    # combo_name -> list of {source, text_snippet, url, sentiment}
    combo_posts: Dict[str, List[Dict]] = defaultdict(list)
    combination_counter = Counter()

    for i, post in enumerate(treatment_posts):
        for combo in post["combinations"]:
            combo_lower = combo.lower()
            if combo_lower != treatment_lower:
                combination_counter[combo] += 1
                # Store a short evidence snippet from this post
                combo_posts[combo].append({
                    "source": post["source"],
                    "text": post["text"][:200] + ("..." if len(post["text"]) > 200 else ""),
                    "url": post.get("url", ""),
                    "sentiment": treatment_sentiments[i]["label"],
                    "timestamp": post.get("timestamp", ""),
                })

    combinations = [
        {
            "name": combo,
            "count": count,
            "evidence": combo_posts[combo][:5],  # Up to 5 source posts
        }
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

    # Aggregate credibility
    avg_cred_score = round(
        sum(c["score"] for c in treatment_credibility) / len(treatment_credibility), 2
    )
    cred_label_counts = Counter(c["label"] for c in treatment_credibility)
    credibility = {
        "average_score": avg_cred_score,
        "average_label": "high" if avg_cred_score >= 0.75 else "medium" if avg_cred_score >= 0.5 else "low",
        "distribution": {
            "high": cred_label_counts.get("high", 0),
            "medium": cred_label_counts.get("medium", 0),
            "low": cred_label_counts.get("low", 0),
        }
    }

    # Aggregate misinformation
    flagged_posts = [m for m in treatment_misinfo if m["is_flagged"]]
    all_categories = []
    all_reasons = []
    for m in flagged_posts:
        all_categories.extend(m.get("categories", []))
        all_reasons.extend(m.get("reasons", []))

    misinformation = {
        "flagged_count": len(flagged_posts),
        "total_posts": total_posts,
        "flagged_pct": round(len(flagged_posts) / total_posts * 100, 1) if total_posts > 0 else 0,
        "categories": dict(Counter(all_categories)),
        "top_reasons": list(set(all_reasons))[:5],
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
            "side_effects": p["side_effects"],
            "credibility": treatment_credibility[i],
            "misinfo": treatment_misinfo[i],
            "video_title": p.get("video_title"),
            "rating": p.get("rating"),
        }
        for i, p in enumerate(treatment_posts)
    ]

    # PubMed evidence
    pubmed_evidence = None
    if pubmed_data:
        pubmed_evidence = {
            "studies_count": pubmed_data.get("studies_count", 0),
            "confirmed_side_effects": pubmed_data.get("confirmed_side_effects", []),
            "top_studies": pubmed_data.get("top_studies", [])[:5],
        }

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
        "credibility": credibility,
        "misinformation": misinformation,
        "source_posts": source_posts,
        "pubmed_evidence": pubmed_evidence,
    }


def _effectiveness_label(positive: int, negative: int, total: int) -> str:
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
    side_effect_mentions = Counter()
    improvement_mentions = Counter()

    for post in posts:
        text_lower = post["text"].lower()

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
    treatments = set()
    for post in extracted_posts:
        treatments.add(post["treatment"])
    return sorted(list(treatments))


def compare_treatments(
    aggregated_data: Dict[str, Dict[str, Any]],
    treatment_names: List[str]
) -> List[Dict[str, Any]]:
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
                "credibility": data["credibility"],
                "misinformation": data["misinformation"],
            })
    return comparison
