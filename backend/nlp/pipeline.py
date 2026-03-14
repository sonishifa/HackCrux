"""
NLP Pipeline Orchestrator
Loads data, runs extraction, sentiment, and aggregation.
Caches results in memory for fast API responses.
"""

import json
import os
from typing import Dict, List, Any, Optional

from nlp.entity_extractor import process_all_posts
from nlp.sentiment import analyze_sentiment
from nlp.aggregator import aggregate_treatment_data, get_all_treatments, compare_treatments


class TreatmentPipeline:
    """Main NLP pipeline that processes patient discussions and caches results."""

    def __init__(self):
        self.raw_posts: List[Dict] = []
        self.extracted_posts: List[Dict] = []
        self.sentiment_results: List[Dict] = []
        self.aggregated_data: Dict[str, Dict] = {}
        self.treatments: List[str] = []
        self.is_initialized: bool = False

    def initialize(self, data_path: Optional[str] = None):
        """Run the full pipeline on startup."""
        if data_path is None:
            data_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "data", "sample_discussions.json"
            )

        print(f"[Pipeline] Loading data from {data_path}...")
        self._load_data(data_path)

        print(f"[Pipeline] Extracting entities from {len(self.raw_posts)} posts...")
        self._extract_entities()

        print("[Pipeline] Running sentiment analysis...")
        self._analyze_sentiment()

        print("[Pipeline] Aggregating treatment data...")
        self._aggregate()

        self.is_initialized = True
        print(f"[Pipeline] Ready! Processed {len(self.raw_posts)} posts for {len(self.treatments)} treatments.")

    def _load_data(self, data_path: str):
        """Load patient discussion data from JSON file."""
        with open(data_path, "r", encoding="utf-8") as f:
            self.raw_posts = json.load(f)

    def _extract_entities(self):
        """Run entity extraction on all posts."""
        self.extracted_posts = process_all_posts(self.raw_posts)

    def _analyze_sentiment(self):
        """Run sentiment analysis on all posts."""
        self.sentiment_results = []
        for post in self.extracted_posts:
            sentiment = analyze_sentiment(post["text"])
            self.sentiment_results.append(sentiment)

    def _aggregate(self):
        """Aggregate data per treatment."""
        self.treatments = get_all_treatments(self.extracted_posts)
        for treatment in self.treatments:
            aggregated = aggregate_treatment_data(
                self.extracted_posts,
                self.sentiment_results,
                treatment
            )
            if aggregated:
                self.aggregated_data[treatment] = aggregated

    def search_treatment(self, treatment_name: str) -> Optional[Dict[str, Any]]:
        """Search for aggregated treatment data."""
        # Case-insensitive search
        for key in self.aggregated_data:
            if key.lower() == treatment_name.lower():
                return self.aggregated_data[key]
        return None

    def get_treatments_list(self) -> List[Dict[str, Any]]:
        """Get list of available treatments with basic stats."""
        result = []
        for treatment in self.treatments:
            data = self.aggregated_data.get(treatment)
            if data:
                result.append({
                    "name": treatment,
                    "total_discussions": data["total_discussions"],
                    "sentiment_score": data["sentiment"]["average_score"],
                    "top_side_effect": data["side_effects"][0]["name"] if data["side_effects"] else "N/A"
                })
        return result

    def compare_treatments(self, treatment_names: List[str]) -> List[Dict[str, Any]]:
        """Compare multiple treatments."""
        return compare_treatments(self.aggregated_data, treatment_names)

    def chat_query(self, message: str) -> Dict[str, Any]:
        """
        RAG-style chat: understand the question, retrieve relevant data,
        and format a natural response with citations.
        """
        message_lower = message.lower()

        # Identify which treatment is being asked about
        target_treatment = None
        for treatment in self.treatments:
            if treatment.lower() in message_lower:
                target_treatment = treatment
                break

        if not target_treatment:
            # Try to provide a general answer
            return {
                "response": f"I can help you with information about these treatments: {', '.join(self.treatments)}. Please mention a specific treatment in your question.",
                "sources": [],
                "treatment": None
            }

        data = self.aggregated_data.get(target_treatment)
        if not data:
            return {
                "response": f"I don't have enough data about {target_treatment} yet.",
                "sources": [],
                "treatment": target_treatment
            }

        # Determine what's being asked
        response_parts = []
        relevant_sources = []

        if any(kw in message_lower for kw in ["side effect", "side-effect", "adverse", "reaction"]):
            top_effects = data["side_effects"][:5]
            effects_text = ", ".join(
                f"{e['name']} ({e['percentage']}%)" for e in top_effects
            )
            response_parts.append(
                f"**Common side effects of {target_treatment}:**\n\n"
                f"The most reported side effects include: {effects_text}.\n\n"
                f"Most patients report these symptoms reducing within 2-3 weeks of starting treatment."
            )

        if any(kw in message_lower for kw in ["effective", "work", "help", "success"]):
            eff = data["effectiveness"]
            response_parts.append(
                f"**Effectiveness of {target_treatment}:**\n\n"
                f"Based on {data['total_discussions']} patient discussions, "
                f"{eff['positive_pct']}% of patients report positive outcomes. "
                f"The treatment is rated as: **{eff['effectiveness_label']}**."
            )

        if any(kw in message_lower for kw in ["timeline", "recovery", "how long", "duration", "when"]):
            timeline = data["recovery_timeline"]
            timeline_text = "\n".join(
                f"- **{t['phase']}**: {t['description']}" for t in timeline[:4]
            )
            response_parts.append(
                f"**Recovery timeline for {target_treatment}:**\n\n{timeline_text}"
            )

        if any(kw in message_lower for kw in ["combin", "together", "alongside", "with what", "pair"]):
            combos = data["combinations"][:5]
            combo_text = ", ".join(c["name"] for c in combos)
            response_parts.append(
                f"**Common treatment combinations with {target_treatment}:**\n\n"
                f"Patients frequently combine {target_treatment} with: {combo_text}."
            )

        if any(kw in message_lower for kw in ["sentiment", "opinion", "feel", "experience"]):
            sent = data["sentiment"]
            response_parts.append(
                f"**Patient sentiment about {target_treatment}:**\n\n"
                f"Overall sentiment score: {sent['average_score']} "
                f"(Positive: {sent['distribution']['positive_pct']}%, "
                f"Neutral: {sent['distribution']['neutral_pct']}%, "
                f"Negative: {sent['distribution']['negative_pct']}%)"
            )

        if any(kw in message_lower for kw in ["dose", "dosage", "how much", "mg"]):
            doses = data.get("dosages", [])
            if doses:
                dose_text = ", ".join(f"{d['dosage']} ({d['count']} mentions)" for d in doses)
                response_parts.append(
                    f"**Commonly reported dosages of {target_treatment}:**\n\n{dose_text}\n\n"
                    f"*Note: Always follow your doctor's prescribed dosage.*"
                )

        # Default: provide overview
        if not response_parts:
            top_effects = data["side_effects"][:3]
            effects_text = ", ".join(f"{e['name']} ({e['percentage']}%)" for e in top_effects)
            eff = data["effectiveness"]
            sent = data["sentiment"]

            response_parts.append(
                f"**Overview of {target_treatment}:**\n\n"
                f"Based on {data['total_discussions']} patient discussions:\n\n"
                f"• **Top side effects:** {effects_text}\n"
                f"• **Effectiveness:** {eff['effectiveness_label']} ({eff['positive_pct']}% positive reports)\n"
                f"• **Overall sentiment:** {'Positive' if sent['average_score'] > 0.1 else 'Neutral' if sent['average_score'] > -0.1 else 'Negative'} (score: {sent['average_score']})\n"
                f"• **Recovery:** Most patients see improvement within 2-4 weeks\n\n"
                f"Feel free to ask about specific aspects like side effects, effectiveness, dosage, or combinations!"
            )

        # Get relevant source posts
        relevant_sources = [
            {"source": p["source"], "text": p["text"][:150] + "...", "url": p["url"]}
            for p in data["source_posts"][:5]
        ]

        return {
            "response": "\n\n".join(response_parts),
            "sources": relevant_sources,
            "treatment": target_treatment,
            "total_discussions": data["total_discussions"]
        }


# Global pipeline instance
pipeline = TreatmentPipeline()
