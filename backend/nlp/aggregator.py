"""
Aggregation Module
Aggregates extracted entities across all posts to produce treatment-level intelligence.
Includes credibility scoring, misinformation detection, and combination source tracing.
"""

from typing import Dict, List, Any, Optional
from collections import Counter, defaultdict

try:
    from nlp.llm_synthesis import synthesize_recovery_timeline, synthesize_sentiment, categorize_treatment, synthesize_disease_context, synthesize_approach_comparison
except ImportError:
    synthesize_recovery_timeline = None
    synthesize_sentiment = None
    categorize_treatment = None
    synthesize_disease_context = None
    synthesize_approach_comparison = None


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
    # Check if this is a drug (has RxNorm match) vs a condition/disease
    is_drug = _is_drug_name(treatment)

    neutral_outcomes = total_posts - positive_outcomes - negative_outcomes
    effectiveness = {
        "positive_reports": positive_outcomes,
        "negative_reports": negative_outcomes,
        "neutral_reports": neutral_outcomes,
        "total_posts": total_posts,
        "positive_pct": round(positive_outcomes / total_posts * 100, 1),
        "negative_pct": round(negative_outcomes / total_posts * 100, 1),
        "neutral_pct": round(neutral_outcomes / total_posts * 100, 1),
        "is_drug": is_drug,
        "effectiveness_label": _effectiveness_label(positive_outcomes, negative_outcomes, total_posts, is_drug)
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

    # Aggregate dosages — only for drug searches so PCOS won't show random "2mg"
    dosages = []
    if is_drug:
        dosage_counter = Counter()
        for post in treatment_posts:
            for dose in post["dosages"]:
                dosage_counter[dose] += 1
        dosages = [
            {"dosage": dose, "count": count}
            for dose, count in dosage_counter.most_common(5)
        ]

    # Recovery timeline is built later with LLM-first + fallback

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

    # Source posts for traceability — FIXED: uses proper enumerate index
    source_posts = []
    for idx, p in enumerate(treatment_posts):
        source_posts.append({
            "id": p["post_id"],
            "source": p["source"],
            "text": (p["text"][:200] + "...") if len(p["text"]) > 200 else p["text"],
            "full_text": p["text"],
            "timestamp": p["timestamp"],
            "url": p.get("url", ""),
            "sentiment": treatment_sentiments[idx]["label"] if idx < len(treatment_sentiments) else "neutral",
            "side_effects": p["side_effects"],
            "credibility": treatment_credibility[idx] if idx < len(treatment_credibility) else {},
            "misinfo": treatment_misinfo[idx] if idx < len(treatment_misinfo) else {},
            "video_title": p.get("video_title"),
            "rating": p.get("rating"),
        })

    # Enhanced Sentiment via LLM
    if synthesize_sentiment:
        llm_sentiment = synthesize_sentiment(treatment, sentiment, source_posts)
        if llm_sentiment:
            sentiment["llm_summary"] = llm_sentiment

    # Build recovery timeline via LLM, fallback to generic
    recovery_timeline = None
    if synthesize_recovery_timeline:
        # Extract temporal mentions to pass to LLM
        temporal_data = _extract_temporal_mentions(treatment_posts)
        recovery_timeline = synthesize_recovery_timeline(treatment, temporal_data, side_effects, avg_score)
        
    if not recovery_timeline:
        recovery_timeline = _build_recovery_timeline(treatment_posts)

    # PubMed evidence
    pubmed_evidence = None
    if pubmed_data:
        pubmed_evidence = {
            "studies_count": pubmed_data.get("studies_count", 0),
            "confirmed_side_effects": pubmed_data.get("confirmed_side_effects", []),
            "top_studies": pubmed_data.get("top_studies", [])[:5],
        }

    # Category
    category = "Unknown"
    if categorize_treatment:
        category = categorize_treatment(treatment)

    # Disease Context
    disease_context = None
    if synthesize_disease_context:
        disease_context = synthesize_disease_context(treatment, source_posts)

    # Approach Comparison (Allopathy vs Naturopathy vs Homeopathy etc.)
    # The LLM synthesis function now scrapes real web data for each approach category
    approach_comparison = None
    if synthesize_approach_comparison:
        approach_comparison = synthesize_approach_comparison(
            treatment, category, effectiveness, side_effects, disease_context
        )

    # Generate AI Summary
    ai_summary = _generate_summary(treatment, is_drug, effectiveness, side_effects, sentiment, total_posts, source_posts)

    return {
        "treatment": treatment,
        "category": category,
        "disease_context": disease_context,
        "total_discussions": total_posts,
        "side_effects": side_effects,
        "sentiment": sentiment,
        "effectiveness": effectiveness,
        "combinations": combinations,
        "dosages": dosages,
        "recovery_timeline": recovery_timeline,
        "approach_comparison": approach_comparison,
        "sources": sources,
        "credibility": credibility,
        "misinformation": misinformation,
        "source_posts": source_posts,
        "pubmed_evidence": pubmed_evidence,
        "ai_summary": ai_summary,
    }


def _effectiveness_label(positive: int, negative: int, total: int, is_drug: bool = True) -> str:
    positive_rate = positive / total if total > 0 else 0
    if not is_drug:
        # For conditions (PCOS, diabetes, etc.) — use patient experience language
        if positive_rate >= 0.6:
            return "Mostly Positive Experiences"
        elif positive_rate >= 0.4:
            return "Mixed Patient Experiences"
        else:
            return "Challenging Experiences Reported"
    # For drugs (Metformin, Insulin, etc.)
    if positive_rate >= 0.7:
        return "Highly Effective"
    elif positive_rate >= 0.5:
        return "Moderately Effective"
    elif positive_rate >= 0.3:
        return "Mixed Results"
    else:
        return "Limited Effectiveness"


def _is_drug_name(name: str) -> bool:
    """Check if the search term is a drug (vs a disease/condition/symptom).
    Uses comprehensive keyword list + RxNorm check."""
    condition_keywords = [
        # Diseases
        "syndrome", "disease", "disorder", "infection", "cancer", "tumor",
        "diabetes", "pcos", "pcod", "asthma", "arthritis", "migraine",
        "depression", "anxiety", "hypertension", "obesity", "flu", "cold",
        "covid", "pneumonia", "bronchitis", "eczema", "psoriasis",
        "thyroid", "lupus", "fibromyalgia", "epilepsy", "gout",
        # Symptoms (searched as conditions)
        "fever", "headache", "cough", "pain", "nausea", "fatigue",
        "diarrhea", "vomiting", "rash", "sore throat", "dizziness",
        "swelling", "bleeding", "cramp", "itch", "allergy", "allergies",
        "constipation", "insomnia", "indigestion", "bloating",
        # Body parts (searched as conditions)
        "lung", "heart", "kidney", "liver", "skin", "acne",
        "eye", "ear", "throat", "nose", "chest", "stomach",
        "back pain", "joint", "muscle", "bone", "blood", "brain",
        # Common condition names
        "malaria", "typhoid", "dengue", "cholera", "jaundice",
        "anemia", "ulcer", "hernia", "stroke", "paralysis",
        "alzheimer", "parkinson", "dementia", "schizophrenia",
        "bipolar", "adhd", "autism", "dyslexia",
        "hiv", "aids", "tb", "tuberculosis", "hepatitis",
        "measles", "mumps", "chickenpox", "smallpox",
        "obesity", "overweight", "underweight",
        "pregnancy", "menopause", "period", "menstrual",
        "infertility", "impotence", "erectile",
        "insomnia", "apnea", "narcolepsy",
        "sciatica", "scoliosis", "osteoporosis",
        "sinusitis", "tonsillitis", "laryngitis",
    ]
    name_lower = name.lower().strip()
    # Direct match or contains condition keyword
    if name_lower in condition_keywords:
        return False
    if any(kw in name_lower for kw in condition_keywords):
        return False
    # Try RxNorm — if it normalizes to a known drug, it's a drug
    try:
        from nlp.drug_normalizer import drug_normalizer
        normalized = drug_normalizer.normalize_treatment_name(name)
        if normalized.lower() != name_lower:
            return True
    except Exception:
        pass
    # LLM fallback: ask Groq if this is a drug or condition
    try:
        from nlp.llm_synthesis import _get_client
        import json as _json
        client = _get_client()
        if client:
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": f'Is "{name}" a pharmaceutical drug/medication or a disease/condition/symptom? Reply ONLY with JSON: {{"type": "drug"}} or {{"type": "condition"}}'}],
                temperature=0, max_tokens=30,
            )
            content = resp.choices[0].message.content.strip()
            if '```' in content:
                content = content.split('```')[1].replace('json', '').strip()
            parsed = _json.loads(content)
            return parsed.get("type", "drug") == "drug"
    except Exception:
        pass
    # Conservative default: if we can't tell, assume condition
    return False


def _generate_summary(treatment, is_drug, effectiveness, side_effects, sentiment, total_posts, source_posts):
    """Generate a context-aware AI summary."""
    top_effect = side_effects[0]["name"] if side_effects else None
    eff_label = effectiveness["effectiveness_label"]
    pos_pct = effectiveness["positive_pct"]
    neg_pct = effectiveness["negative_pct"]
    neutral_pct = effectiveness.get("neutral_pct", 0)
    avg_sentiment = sentiment.get("average_score", 0)
    sentiment_label = "positive" if avg_sentiment > 0.1 else "negative" if avg_sentiment < -0.1 else "neutral"

    # Try LLM summary first
    try:
        from nlp.llm_synthesis import _get_client
        import json as _json
        client = _get_client()
        if client:
            context = f"""Generate a 2-3 sentence summary for a patient report about '{treatment}'.
Data: {total_posts} patient discussions analyzed.
- {'Drug/medication' if is_drug else 'Disease/condition/symptom'}
- Patient sentiment: {sentiment_label} (score: {avg_sentiment})
- {pos_pct}% positive outcomes, {neg_pct}% negative, {neutral_pct}% neutral
- Top discussed side effect: {top_effect or 'none identified'}
- Effectiveness: {eff_label}

Make it specific to {treatment}. Don't mention side effects OF {treatment} if {treatment} is itself a symptom/condition.
Return ONLY JSON: {{"summary": "..."}}"""
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": "You write patient-friendly medical data summaries. Be factual and specific."}, {"role": "user", "content": context}],
                temperature=0.2, max_tokens=200,
            )
            content = resp.choices[0].message.content.strip()
            if '```' in content:
                content = content.split('```json')[-1].split('```')[0].strip() if '```json' in content else content.split('```')[1].strip()
            parsed = _json.loads(content)
            if "summary" in parsed:
                return parsed["summary"]
    except Exception:
        pass

    # Fallback: context-aware template
    if is_drug:
        summary = f"Based on {total_posts} patient discussions, {treatment} shows {eff_label.lower()}."
        if top_effect:
            summary += f" The most commonly reported side effect is {top_effect}."
        summary += f" {pos_pct}% of patients reported positive outcomes, while {neg_pct}% reported negative experiences."
    else:
        summary = f"Based on {total_posts} patient discussions about {treatment}, overall patient sentiment is {sentiment_label}."
        if top_effect:
            summary += f" Patients most frequently discuss {top_effect} in relation to {treatment}."
        summary += f" {pos_pct}% of discussions reflect positive experiences managing {treatment}."

    return summary


def _extract_temporal_mentions(posts: List[Dict[str, Any]]) -> Dict[str, int]:
    mentions = Counter()
    for post in posts:
        text_lower = post["text"].lower()
        if any(w in text_lower for w in ["first week", "week 1", "week one", "first few days"]):
            mentions["Week 1"] += 1
        if any(w in text_lower for w in ["week 2", "week two", "second week", "2 weeks"]):
            mentions["Week 2"] += 1
        if any(w in text_lower for w in ["week 3", "week three", "third week", "3 weeks"]):
            mentions["Week 3"] += 1
        if any(w in text_lower for w in ["month 1", "month one", "first month", "4 weeks", "week 4"]):
            mentions["Month 1"] += 1
        if any(w in text_lower for w in ["month 2", "2 months", "two months"]):
            mentions["Month 2"] += 1
        if any(w in text_lower for w in ["month 3", "3 months", "three months"]):
            mentions["Month 3"] += 1
    return dict(mentions)


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
                "category": data.get("category", "Unknown"),
                "total_discussions": data["total_discussions"],
                "top_side_effects": data["side_effects"][:5],
                "sentiment": data["sentiment"],
                "effectiveness": data["effectiveness"],
                "top_combinations": data["combinations"][:3],
                "credibility": data["credibility"],
                "misinformation": data["misinformation"],
            })
    return comparison
