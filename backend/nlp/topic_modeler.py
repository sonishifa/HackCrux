"""
Topic Modeling Module (Document §11)
Discovers hidden themes/topics in patient discussions using keyword clustering.
Produces meaningful multi-word topic phrases instead of raw single keywords.
"""

import re
from typing import Dict, List, Any
from collections import Counter


# Stop words to exclude from topic analysis
STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her",
    "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
    "themselves", "what", "which", "who", "whom", "this", "that", "these", "those",
    "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if",
    "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
    "about", "against", "between", "through", "during", "before", "after", "above",
    "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
    "again", "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "both", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s",
    "t", "can", "will", "just", "don", "should", "now", "d", "ll", "m", "o", "re",
    "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn", "haven",
    "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn", "wasn", "weren",
    "won", "wouldn", "also", "would", "could", "much", "get", "got", "going",
    "went", "like", "really", "still", "well", "even", "back", "one", "two",
    "started", "taking", "took", "take", "put", "feel", "feeling", "felt",
    "know", "said", "told", "since", "first", "think", "things", "thing",
    "way", "make", "made", "day", "days", "time", "lot", "bit", "try",
    "tried", "people", "anyone", "someone", "something", "everything", "nothing",
    "year", "years", "ago", "etc", "always", "never", "already", "seem",
    "want", "need", "use", "used", "every", "around", "many", "long", "new",
    "good", "bad", "last", "right", "left", "come", "came", "keep", "help",
    "went", "say", "tell", "see", "look", "give", "best", "work", "let",
}


def _tokenize(text: str) -> List[str]:
    """Simple tokenization: lowercase, alpha-only, remove stop words."""
    words = re.findall(r'[a-z]+', text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]


def _extract_bigrams(text: str) -> List[str]:
    """Extract meaningful two-word phrases from text.
    Both words must pass stop-word filter, and at least one must be medically relevant."""
    words = re.findall(r'[a-z]+', text.lower())
    filtered = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    bigrams = []
    for i in range(len(filtered) - 1):
        w1, w2 = filtered[i], filtered[i+1]
        # At least one word must be health/medical related to avoid noise
        if _is_medical_word(w1) or _is_medical_word(w2):
            bigrams.append(f"{w1} {w2}")
    return bigrams


# Medical vocabulary for filtering irrelevant bigrams
_MEDICAL_WORDS = {
    # Body and health
    "pain", "treatment", "doctor", "medicine", "drug", "dose", "dosage",
    "symptom", "symptoms", "side", "effect", "effects", "health", "medical",
    "patient", "hospital", "clinic", "therapy", "diagnosis", "condition",
    "disease", "chronic", "acute", "medication", "prescription", "pills",
    "tablet", "capsule", "injection", "surgery", "recovery", "healing",
    # Body parts
    "head", "chest", "stomach", "heart", "lung", "liver", "kidney",
    "blood", "brain", "skin", "bone", "joint", "muscle", "throat",
    "eye", "ear", "nose", "mouth", "back", "neck",
    # Symptoms
    "fever", "cough", "cold", "nausea", "fatigue", "diarrhea", "vomiting",
    "headache", "dizziness", "rash", "swelling", "bleeding", "cramps",
    "inflammation", "infection", "anxiety", "depression", "insomnia",
    "constipation", "bloating", "numbness", "weakness", "tiredness",
    # Treatments
    "diet", "exercise", "yoga", "fasting", "supplements", "vitamin",
    "antibiotic", "painkiller", "steroid", "insulin", "aspirin",
    "ibuprofen", "paracetamol", "ayurveda", "homeopathy", "naturopathy",
    # Outcomes
    "improvement", "relief", "cure", "cured", "healed", "recovered",
    "worse", "worsened", "stable", "controlled", "managed",
    "effective", "ineffective", "helped", "reduced", "increased",
}

def _is_medical_word(word: str) -> bool:
    """Check if a word is medically relevant."""
    return word in _MEDICAL_WORDS or any(mw in word for mw in _MEDICAL_WORDS if len(mw) > 4)


# Topic definitions with seed phrases and keywords (multi-word where possible)
TOPIC_SEEDS = {
    "Side Effects & Symptoms": {
        "phrases": [
            "side effects", "stomach pain", "weight gain", "weight loss",
            "hair loss", "muscle pain", "joint pain", "dry mouth",
            "blurred vision", "blood sugar", "high blood pressure",
            "skin rash", "upset stomach", "feeling dizzy",
        ],
        "keywords": [
            "nausea", "fatigue", "diarrhea", "headache", "dizziness", "pain",
            "stomach", "vomiting", "rash", "bloating", "cramps",
            "tiredness", "insomnia", "constipation", "swelling", "anxiety",
            "irritation", "inflammation", "drowsiness", "numbness",
        ],
    },
    "Treatment Effectiveness": {
        "phrases": [
            "worked well", "very effective", "life changing", "game changer",
            "stopped working", "didn't work", "helped lot", "blood sugar levels",
            "completely cured", "significant improvement", "noticeable difference",
        ],
        "keywords": [
            "improved", "better", "effective", "works", "helped", "controlled",
            "stabilized", "normalized", "reduced", "results", "improvement",
            "benefit", "success", "amazing", "relief", "recovered",
        ],
    },
    "Dosage & Administration": {
        "phrases": [
            "dose increased", "extended release", "twice daily", "empty stomach",
            "prescribed dose", "gradually increased", "starting dose",
            "higher dose", "lower dose", "missed dose",
        ],
        "keywords": [
            "dose", "dosage", "pills", "tablet", "daily", "morning",
            "evening", "food", "meals", "prescription", "prescribed",
            "increase", "reduce", "gradually", "milligrams",
        ],
    },
    "Lifestyle & Diet Changes": {
        "phrases": [
            "diet changes", "lifestyle changes", "low carb", "regular exercise",
            "healthy eating", "weight management", "stress management",
            "intermittent fasting", "dietary supplements",
        ],
        "keywords": [
            "exercise", "diet", "walking", "yoga", "fasting", "weight",
            "lifestyle", "dietary", "carb", "keto", "mediterranean",
            "probiotics", "supplements", "nutrition", "sleep",
        ],
    },
    "Long-term Management": {
        "phrases": [
            "long term", "over time", "chronic condition", "maintenance dose",
            "regular checkups", "blood tests", "monitoring levels",
            "quality life", "managing symptoms",
        ],
        "keywords": [
            "months", "routine", "chronic", "management", "monitor",
            "ongoing", "regular", "maintaining", "adjustment", "progress",
            "sustained", "stable", "consistent",
        ],
    },
}


def discover_topics_simple(posts: List[Dict[str, Any]], n_topics: int = 5, n_words: int = 6) -> List[Dict[str, Any]]:
    """
    Discover topics from patient discussions using multi-word phrase matching.
    Returns meaningful themes with descriptive keyword phrases and example posts.
    """
    if not posts or len(posts) < 3:
        return []

    # Collect all text
    all_text = " ".join(post.get("text", "") for post in posts).lower()
    all_tokens = _tokenize(all_text)

    if not all_tokens:
        return []

    # Count single-word tokens
    word_counts = Counter(all_tokens)

    # Count bigrams (now filtered for medical relevance)
    bigram_counts = Counter()
    for post in posts:
        bigrams = _extract_bigrams(post.get("text", ""))
        bigram_counts.update(bigrams)

    topics = []
    for theme, seeds in TOPIC_SEEDS.items():
        # Score phrases found in text
        phrase_matches = []
        for phrase in seeds["phrases"]:
            count = all_text.count(phrase)
            if count > 0:
                phrase_matches.append((phrase, count))

        # Score single-word seeds
        keyword_relevance = sum(word_counts.get(w, 0) for w in seeds["keywords"])

        # Score bigrams containing seed words
        bigram_matches = []
        for bigram, count in bigram_counts.items():
            parts = bigram.split()
            if any(p in seeds["keywords"] for p in parts) and count >= 2:
                bigram_matches.append((bigram, count))

        total_relevance = keyword_relevance + sum(c * 3 for _, c in phrase_matches) + sum(c * 2 for _, c in bigram_matches)

        if total_relevance == 0:
            continue

        # Build final keyword list: prefer phrases > bigrams > single words
        final_keywords = []
        for phrase, c in sorted(phrase_matches, key=lambda x: x[1], reverse=True):
            if len(final_keywords) < n_words:
                final_keywords.append(phrase)

        for bigram, c in sorted(bigram_matches, key=lambda x: x[1], reverse=True):
            if len(final_keywords) < n_words and bigram not in final_keywords:
                final_keywords.append(bigram)

        # Fill remaining with top single keywords (as descriptive phrases)
        keyword_map = {
            "nausea": "nausea symptoms", "fatigue": "chronic fatigue", "diarrhea": "digestive issues",
            "headache": "headache episodes", "dizziness": "dizziness episodes", "bloating": "abdominal bloating",
            "insomnia": "sleep difficulties", "anxiety": "anxiety management", "pain": "pain management",
            "stomach": "stomach issues", "vomiting": "vomiting episodes", "rash": "skin reactions",
            "cramps": "muscle cramps", "tiredness": "persistent tiredness", "constipation": "constipation relief",
            "swelling": "swelling concerns", "irritation": "irritation symptoms", "inflammation": "inflammation response",
            "drowsiness": "daytime drowsiness", "numbness": "numbness and tingling",
            "improved": "symptom improvement", "better": "feeling better", "effective": "treatment effectiveness",
            "works": "how it works", "helped": "treatment helped", "controlled": "condition controlled",
            "stabilized": "condition stabilized", "normalized": "levels normalized", "reduced": "symptoms reduced",
            "results": "treatment results", "improvement": "noticeable improvement", "benefit": "treatment benefits",
            "success": "treatment success", "amazing": "positive outcomes", "relief": "symptom relief",
            "recovered": "recovery experience",
            "dose": "dosage adjustment", "dosage": "dosage guidelines", "pills": "pill schedule",
            "tablet": "tablet form", "daily": "daily routine", "morning": "morning dosage",
            "evening": "evening dosage", "food": "taking with food", "meals": "meal timing",
            "prescription": "prescription details", "prescribed": "doctor prescribed",
            "increase": "dose increase", "reduce": "dose reduction", "gradually": "gradual adjustment",
            "milligrams": "dosage amount",
            "exercise": "physical exercise", "diet": "dietary changes", "walking": "walking routine",
            "yoga": "yoga practice", "fasting": "fasting approach", "weight": "weight management",
            "lifestyle": "lifestyle modification", "dietary": "dietary adjustments", "carb": "carb management",
            "keto": "keto diet approach", "mediterranean": "mediterranean diet", "probiotics": "probiotic supplements",
            "supplements": "dietary supplements", "nutrition": "nutrition planning", "sleep": "sleep quality",
            "months": "long-term outlook", "routine": "daily routine", "chronic": "chronic management",
            "management": "condition management", "monitor": "health monitoring", "ongoing": "ongoing treatment",
            "regular": "regular checkups", "maintaining": "maintaining progress", "adjustment": "treatment adjustment",
            "progress": "tracking progress", "sustained": "sustained results", "stable": "stable condition",
            "consistent": "consistent routine",
        }
        _auto_suffixes = {
            "Side Effects & Symptoms": "symptoms",
            "Treatment Effectiveness": "outcomes",
            "Dosage & Administration": "details",
            "Lifestyle & Diet Changes": "adjustments",
            "Long-term Management": "management",
        }
        auto_suffix = _auto_suffixes.get(theme, "related")
        top_singles = sorted(
            [(w, word_counts.get(w, 0)) for w in seeds["keywords"] if word_counts.get(w, 0) > 0],
            key=lambda x: x[1], reverse=True,
        )
        for w, c in top_singles:
            if len(final_keywords) >= n_words:
                break
            mapped = keyword_map.get(w)
            if not mapped:
                mapped = f"{w} {auto_suffix}"
            if mapped not in final_keywords:
                final_keywords.append(mapped)

        if final_keywords:
            keyword_counts_map = {}
            for kw in final_keywords:
                count = 0
                if kw in dict(phrase_matches):
                    count = dict(phrase_matches)[kw] * 3
                elif kw in dict(bigram_matches):
                    count = dict(bigram_matches)[kw] * 2
                else:
                    for orig, mapped in keyword_map.items():
                        if mapped == kw:
                            count = word_counts.get(orig, 0)
                            break
                    if count == 0:
                        count = word_counts.get(kw, 1)
                keyword_counts_map[kw] = count

            # Find example posts for this topic
            example_posts = []
            all_seed_words = set(seeds["keywords"]) | set(w for phrase in seeds["phrases"] for w in phrase.split())
            # Also check the final matched keywords (stripped phrases)
            matched_words = set()
            for kw in final_keywords:
                matched_words.update(kw.lower().split())

            # Pass 1: posts matching at least 1 seed word
            scored_posts = []
            for post in posts:
                post_lower = post.get("text", "").lower()
                matches = sum(1 for w in all_seed_words if w in post_lower)
                matches += sum(1 for w in matched_words if w in post_lower and w not in STOP_WORDS and len(w) > 3)
                if matches >= 1 and len(post.get("text", "")) > 30:
                    scored_posts.append((matches, post))

            # Sort by match count, take top 3
            scored_posts.sort(key=lambda x: x[0], reverse=True)
            for _, post in scored_posts[:3]:
                text = post.get("text", "")
                example_posts.append({
                    "text": text[:200] + ("..." if len(text) > 200 else ""),
                    "source": post.get("source", ""),
                    "url": post.get("url", ""),
                })

            # Pass 2 fallback: if still empty, just grab any post
            if not example_posts and posts:
                for post in posts[:3]:
                    text = post.get("text", "")
                    if len(text) > 30:
                        example_posts.append({
                            "text": text[:200] + ("..." if len(text) > 200 else ""),
                            "source": post.get("source", ""),
                            "url": post.get("url", ""),
                        })

            topics.append({
                "theme": theme,
                "keywords": final_keywords[:n_words],
                "keyword_counts": keyword_counts_map,
                "relevance_score": round(total_relevance / len(all_tokens) * 100, 2),
                "total_mentions": total_relevance,
                "example_posts": example_posts,
            })

    # Sort by relevance
    topics.sort(key=lambda t: t["total_mentions"], reverse=True)
    return topics[:n_topics]


def discover_topics_for_treatment(
    posts: List[Dict[str, Any]],
    treatment: str
) -> List[Dict[str, Any]]:
    """
    Discover topics specific to a treatment from its discussion posts.
    """
    treatment_lower = treatment.lower()
    treatment_posts = [
        p for p in posts
        if p.get("treatment", "").lower() == treatment_lower
    ]

    if not treatment_posts:
        return []

    return discover_topics_simple(treatment_posts)

