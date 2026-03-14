"""
Topic Modeling Module (Document §11)
Discovers hidden themes/topics in patient discussions using TF-IDF + LDA.
Lightweight, fast, no extra model downloads needed.
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
    "way", "make", "made", "day", "days",
}


def _tokenize(text: str) -> List[str]:
    """Simple tokenization: lowercase, alpha-only, remove stop words."""
    words = re.findall(r'[a-z]+', text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]


def discover_topics_simple(posts: List[Dict[str, Any]], n_topics: int = 5, n_words: int = 6) -> List[Dict[str, Any]]:
    """
    Discover topics from patient discussions using word frequency analysis.
    This is a lightweight alternative to full LDA that works without scikit-learn.
    
    Returns a list of topics, each with keywords and representative theme.
    """
    if not posts or len(posts) < 3:
        return []

    # Collect all tokens
    all_tokens = []
    for post in posts:
        tokens = _tokenize(post.get("text", ""))
        all_tokens.extend(tokens)

    if not all_tokens:
        return []

    # Get most common meaningful words
    word_counts = Counter(all_tokens)

    # Group related words into topic clusters
    topic_seeds = {
        "Side Effects & Symptoms": [
            "nausea", "fatigue", "diarrhea", "headache", "dizziness", "pain",
            "stomach", "vomiting", "rash", "cough", "bloating", "cramps",
            "tiredness", "insomnia", "constipation", "discomfort", "irritation",
            "swelling", "bruising", "metallic"
        ],
        "Treatment Effectiveness": [
            "improved", "better", "effective", "works", "helped", "controlled",
            "stabilized", "excellent", "normalized", "dropped", "reduced",
            "results", "improvement", "benefit", "success", "amazing"
        ],
        "Dosage & Administration": [
            "dose", "dosage", "pills", "tablet", "daily", "twice", "morning",
            "evening", "food", "meals", "breakfast", "prescription", "prescribed",
            "increase", "reduce", "gradually", "extended", "release"
        ],
        "Lifestyle & Combinations": [
            "exercise", "diet", "walking", "yoga", "fasting", "weight",
            "lifestyle", "dietary", "carb", "keto", "mediterranean",
            "probiotics", "supplements", "combination", "combined", "alongside"
        ],
        "Recovery & Timeline": [
            "week", "weeks", "month", "months", "adjustment", "gradually",
            "eventually", "slowly", "patience", "routine", "long", "term",
            "recovery", "timeline", "progress", "improvement", "stabilize"
        ]
    }

    topics = []
    for theme, seed_words in topic_seeds.items():
        # Count how many of the seed words appear
        relevance = sum(word_counts.get(w, 0) for w in seed_words)
        if relevance == 0:
            continue

        # Get actual top words from this topic that appear in the data
        top_words = sorted(
            [(w, word_counts.get(w, 0)) for w in seed_words if word_counts.get(w, 0) > 0],
            key=lambda x: x[1],
            reverse=True
        )[:n_words]

        if top_words:
            topics.append({
                "theme": theme,
                "keywords": [w for w, _ in top_words],
                "keyword_counts": {w: c for w, c in top_words},
                "relevance_score": round(relevance / len(all_tokens) * 100, 2),
                "total_mentions": relevance,
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
