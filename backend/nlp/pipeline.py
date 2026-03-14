"""
NLP Pipeline Orchestrator — Full Dynamic Multi-Source Mode.
Sources: Reddit JSON, PubMed (NIH), Drugs.com — all free, no API keys.
YouTube is NOT included in scraping (requires key, omitted per spec).
Concurrent scraping via ThreadPoolExecutor for 2–4s response times.
Disk cache. Groq-powered chat and entity extraction (optional).
"""

import json
import os
import time
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()

from nlp.text_cleaner import preprocess_batch
from nlp.entity_extractor import process_all_posts
from nlp.sentiment import analyze_sentiment
from nlp.credibility import score_credibility
from nlp.misinfo import detect_misinformation
from nlp.topic_modeler import discover_topics_for_treatment
from nlp.aggregator import aggregate_treatment_data, get_all_treatments, compare_treatments
from nlp.drug_normalizer import drug_normalizer

from scrapers.reddit_scraper import reddit_scraper
from scrapers.web_scraper import web_scraper
from scrapers.pubmed_scraper import pubmed_scraper

# Cache config
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cache")
CACHE_TTL_HOURS = int(os.getenv("CACHE_TTL_HOURS", "24"))

# Per-scraper timeout in seconds
SCRAPER_TIMEOUT = 20


def _slug(name: str) -> str:
    return hashlib.md5(name.lower().strip().encode()).hexdigest()[:12]


class TreatmentPipeline:
    """
    Dynamic NLP pipeline. No sample data.
    On search: check cache → scrape live (concurrently) → NLP → cache to disk.
    Active sources: Reddit JSON, PubMed (NIH eutils), Drugs.com — all key-free.
    """

    def __init__(self):
        self.raw_posts: List[Dict] = []
        self.cleaned_posts: List[Dict] = []
        self.extracted_posts: List[Dict] = []
        self.sentiment_results: List[Dict] = []
        self.credibility_results: List[Dict] = []
        self.misinfo_results: List[Dict] = []
        self.aggregated_data: Dict[str, Dict] = {}
        self.treatments: List[str] = []
        self.topics: Dict[str, List[Dict]] = {}
        self.pubmed_evidence: Dict[str, Dict] = {}
        self.is_initialized: bool = False
        self.stats: Dict[str, Any] = {}
        self.active_scrapers: List[str] = []
        self.live_scraping_enabled: bool = True
        self.progress_log: List[str] = []

    def initialize(self):
        """Load disk cache. No sample data needed."""
        start_time = time.time()

        # Active scrapers — only key-free sources
        self.active_scrapers = []
        if reddit_scraper.is_configured:
            self.active_scrapers.append("Reddit")
        if pubmed_scraper.is_configured:
            self.active_scrapers.append("PubMed")
        if web_scraper.is_configured:
            self.active_scrapers.append("Drugs.com")
        # YouTube intentionally excluded — requires API key

        self.live_scraping_enabled = len(self.active_scrapers) > 0

        # Load disk cache
        cached_count = self._load_disk_cache()

        elapsed = round(time.time() - start_time, 2)
        self.is_initialized = True
        self._update_stats(elapsed)

        print(f"[Pipeline] Ready! Sources: {', '.join(self.active_scrapers)}")
        print(f"[Pipeline] {cached_count} treatments loaded from cache in {elapsed}s")
        print(f"[Pipeline] Search for ANY treatment — live data will be fetched!")

    def _load_disk_cache(self) -> int:
        """Load cached treatment data from disk."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        count = 0

        try:
            for filename in os.listdir(CACHE_DIR):
                if not filename.endswith(".json"):
                    continue
                filepath = os.path.join(CACHE_DIR, filename)
                try:
                    with open(filepath, "r") as f:
                        cached = json.load(f)

                    cached_time = cached.get("_cached_at", 0)
                    age_hours = (time.time() - cached_time) / 3600
                    if age_hours > CACHE_TTL_HOURS:
                        continue

                    treatment = cached.get("treatment", "")
                    if treatment:
                        self.aggregated_data[treatment] = cached
                        if treatment not in self.treatments:
                            self.treatments.append(treatment)
                        count += 1
                except Exception:
                    continue
        except FileNotFoundError:
            pass

        return count

    def _save_to_cache(self, treatment: str, data: Dict):
        """Save treatment data to disk cache."""
        os.makedirs(CACHE_DIR, exist_ok=True)
        data["_cached_at"] = time.time()
        filepath = os.path.join(CACHE_DIR, f"{_slug(treatment)}.json")
        try:
            with open(filepath, "w") as f:
                json.dump(data, f, default=str)
        except Exception as e:
            print(f"[Pipeline] Cache write error: {e}")

    def _log_progress(self, message: str):
        """Log progress for SSE streaming."""
        self.progress_log.append(message)
        print(f"[Pipeline] {message}")

    def _process_posts(self, posts: List[Dict], treatment_override: str = None):
        """Run the full NLP pipeline on a batch of posts."""
        cleaned = preprocess_batch(posts)
        self.cleaned_posts.extend(cleaned)

        extracted = process_all_posts(cleaned)
        self.extracted_posts.extend(extracted)

        sentiments = [analyze_sentiment(p["text"]) for p in extracted]
        self.sentiment_results.extend(sentiments)

        credibilities = [score_credibility(p) for p in cleaned]
        self.credibility_results.extend(credibilities)

        misinfos = [detect_misinformation(p.get("text", "")) for p in cleaned]
        self.misinfo_results.extend(misinfos)

        if treatment_override:
            treatments_to_process = [treatment_override]
        else:
            treatments_to_process = get_all_treatments(self.extracted_posts)

        self.treatments = list(set(self.treatments + get_all_treatments(self.extracted_posts)))

        for treatment in treatments_to_process:
            pubmed_data = self.pubmed_evidence.get(treatment)

            aggregated = aggregate_treatment_data(
                self.extracted_posts,
                self.sentiment_results,
                self.credibility_results,
                self.misinfo_results,
                treatment,
                pubmed_data=pubmed_data,
            )
            if aggregated:
                self.aggregated_data[treatment] = aggregated

        for treatment in treatments_to_process:
            topics = discover_topics_for_treatment(self.extracted_posts, treatment)
            self.topics[treatment] = topics
            if treatment in self.aggregated_data:
                self.aggregated_data[treatment]["topics"] = topics

    def process_live(self, treatment_name: str) -> Optional[Dict[str, Any]]:
        """
        Scrape all 3 sources CONCURRENTLY then run NLP.
        Reddit + PubMed + Drugs.com run in parallel — total scraping time ~3–8s
        instead of 30–60s sequential.
        """
        self.progress_log = []

        # Step 0: Normalize
        self._log_progress(f"Normalizing '{treatment_name}'...")
        normalized = drug_normalizer.normalize_treatment_name(treatment_name)
        if normalized != treatment_name:
            self._log_progress(f"Normalized: '{treatment_name}' → '{normalized}'")
            treatment_name = normalized

        self._log_progress(f"Fetching data for '{treatment_name}' from {', '.join(self.active_scrapers)}...")
        start_time = time.time()

        all_posts = []
        pubmed_evidence_result = {}

        # ── Concurrent scraping ────────────────────────────────────────────────
        def scrape_reddit():
            if reddit_scraper.is_configured:
                return ("reddit", reddit_scraper.scrape_treatment(treatment_name, max_posts=20), None)
            return ("reddit", [], None)

        def scrape_pubmed():
            if pubmed_scraper.is_configured:
                posts = pubmed_scraper.scrape_treatment(treatment_name, max_posts=8)
                evidence = pubmed_scraper.get_evidence(treatment_name)
                return ("pubmed", posts, evidence)
            return ("pubmed", [], {})

        def scrape_drugs():
            if web_scraper.is_configured:
                return ("drugs", web_scraper.scrape_treatment(treatment_name, max_posts=15), None)
            return ("drugs", [], None)

        scrapers = [scrape_reddit, scrape_pubmed, scrape_drugs]

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(fn): fn.__name__ for fn in scrapers}
            for future in as_completed(futures, timeout=SCRAPER_TIMEOUT + 5):
                try:
                    source_key, posts, extra = future.result(timeout=SCRAPER_TIMEOUT)
                    all_posts.extend(posts)
                    if source_key == "pubmed" and extra:
                        pubmed_evidence_result = extra
                    src_count = len(posts)
                    if src_count > 0:
                        self._log_progress(f"✓ {source_key.capitalize()}: {src_count} posts")
                except FuturesTimeout:
                    self._log_progress(f"⚠ Scraper timed out")
                except Exception as e:
                    self._log_progress(f"⚠ Scraper error: {e}")

        # Store PubMed evidence
        if pubmed_evidence_result:
            self.pubmed_evidence[treatment_name] = pubmed_evidence_result

        if not all_posts:
            self._log_progress(f"No posts found for '{treatment_name}'")
            return None

        source_summary = {}
        for p in all_posts:
            src = p.get("source", "Unknown")
            source_summary[src] = source_summary.get(src, 0) + 1
        summary_str = ", ".join(f"{v} from {k}" for k, v in source_summary.items())
        self._log_progress(f"Collected {len(all_posts)} posts ({summary_str})")

        # ── NLP pipeline ──────────────────────────────────────────────────────
        self._log_progress("Analyzing posts (NLP pipeline)...")
        self._process_posts(all_posts, treatment_override=treatment_name)

        result = self.aggregated_data.get(treatment_name)
        if result:
            self._save_to_cache(treatment_name, result)

        elapsed = round(time.time() - start_time, 2)
        self._log_progress(f"Complete in {elapsed}s")
        self._update_stats(elapsed)

        return result

    def search_treatment(self, treatment_name: str) -> Optional[Dict[str, Any]]:
        """Search: normalize → check cache → scrape live."""
        normalized = drug_normalizer.normalize_treatment_name(treatment_name)
        if normalized != treatment_name:
            treatment_name = normalized

        # In-memory cache
        for key in self.aggregated_data:
            if key.lower() == treatment_name.lower():
                return self.aggregated_data[key]

        # Disk cache
        slug = _slug(treatment_name)
        cache_file = os.path.join(CACHE_DIR, f"{slug}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r") as f:
                    cached = json.load(f)
                age_hours = (time.time() - cached.get("_cached_at", 0)) / 3600
                if age_hours <= CACHE_TTL_HOURS:
                    self.aggregated_data[treatment_name] = cached
                    return cached
            except Exception:
                pass

        if self.live_scraping_enabled:
            return self.process_live(treatment_name)

        return None

    def get_treatments_list(self) -> List[Dict[str, Any]]:
        result = []
        for treatment in self.treatments:
            data = self.aggregated_data.get(treatment)
            if data:
                result.append({
                    "name": treatment,
                    "total_discussions": data.get("total_discussions", 0),
                    "sentiment_score": data.get("sentiment", {}).get("average_score", 0),
                    "top_side_effect": data["side_effects"][0]["name"] if data.get("side_effects") else "N/A"
                })
        return result

    def compare_treatments(self, treatment_names: List[str]) -> List[Dict[str, Any]]:
        return compare_treatments(self.aggregated_data, treatment_names)

    def get_source_status(self) -> Dict[str, Any]:
        return {
            "reddit": reddit_scraper.is_configured,
            "pubmed": pubmed_scraper.is_configured,
            "drugs_com": web_scraper.is_configured,
            "youtube": False,  # Intentionally excluded
            "active_sources": self.active_scrapers,
        }

    def _update_stats(self, elapsed: float = 0):
        self.stats = {
            "total_posts": len(self.extracted_posts),
            "treatments_count": len(self.treatments),
            "treatments": self.treatments,
            "pipeline_time_seconds": elapsed,
            "live_scraping_enabled": self.live_scraping_enabled,
            "active_sources": self.active_scrapers,
        }

    def get_stats(self) -> Dict[str, Any]:
        if not self.is_initialized:
            return {"status": "not_initialized"}

        per_treatment = {}
        for treatment in self.treatments:
            data = self.aggregated_data.get(treatment, {})
            per_treatment[treatment] = {
                "discussions": data.get("total_discussions", 0),
                "side_effects_detected": len(data.get("side_effects", [])),
                "combinations_found": len(data.get("combinations", [])),
                "topics_discovered": len(self.topics.get(treatment, [])),
                "sentiment_score": data.get("sentiment", {}).get("average_score", 0),
            }

        return {
            **self.stats,
            "per_treatment": per_treatment,
            "source_status": self.get_source_status(),
            "pipeline_stages": [
                "Drug Name Normalization (RxNorm)",
                "Concurrent Scraping (Reddit, PubMed, Drugs.com)",
                "Text Cleaning & Language Filtering",
                "Entity Extraction (LLM + Patterns)",
                "Sentiment Analysis (VADER)",
                "Credibility Scoring",
                "Misinformation Detection",
                "Data Aggregation",
                "Topic Modeling",
            ],
        }

    def chat_query(self, message: str) -> Dict[str, Any]:
        message_lower = message.lower()

        try:
            from nlp.llm_chat import llm_chat_query
            result = llm_chat_query(message, self)
            if result:
                return result
        except (ImportError, Exception):
            pass

        return self._keyword_chat(message)

    def _keyword_chat(self, message: str) -> Dict[str, Any]:
        message_lower = message.lower()

        target_treatment = None
        for treatment in self.treatments:
            if treatment.lower() in message_lower:
                target_treatment = treatment
                break

        if not target_treatment:
            words = message.split()
            for word in words:
                if len(word) > 3 and word[0].isupper():
                    result = self.search_treatment(word)
                    if result:
                        target_treatment = word
                        break

        if not target_treatment:
            return {
                "response": (
                    f"I can help with treatment information. "
                    f"Currently cached: {', '.join(self.treatments) if self.treatments else 'none yet'}. "
                    f"Search for any treatment name and I'll fetch live data from "
                    f"{', '.join(self.active_scrapers)}!"
                ),
                "sources": [],
                "treatment": None,
            }

        data = self.aggregated_data.get(target_treatment)
        if not data:
            return {
                "response": f"No data available for {target_treatment} yet. Try searching for it first.",
                "sources": [],
                "treatment": target_treatment,
            }

        top_effects = data.get("side_effects", [])[:3]
        effects_text = ", ".join(f"{e['name']} ({e['percentage']}%)" for e in top_effects)
        eff = data.get("effectiveness", {})
        sent = data.get("sentiment", {})
        label = 'Positive' if sent.get('average_score', 0) > 0.1 else 'Neutral' if sent.get('average_score', 0) > -0.1 else 'Negative'

        response = (
            f"**Overview of {target_treatment}:**\n\n"
            f"Based on {data.get('total_discussions', 0)} patient discussions from {', '.join(data.get('sources', {}).get('breakdown', {}).keys())}:\n\n"
            f"• **Top side effects:** {effects_text}\n"
            f"• **Effectiveness:** {eff.get('effectiveness_label', 'N/A')} ({eff.get('positive_pct', 0)}% positive)\n"
            f"• **Sentiment:** {label} (score: {sent.get('average_score', 0)})\n\n"
            f"Ask about side effects, effectiveness, dosage, combinations, or credibility!"
        )

        relevant_sources = [
            {"source": p["source"], "text": p["text"][:150] + "...", "url": p.get("url", "")}
            for p in data.get("source_posts", [])[:5]
        ]

        return {
            "response": response,
            "sources": relevant_sources,
            "treatment": target_treatment,
            "total_discussions": data.get("total_discussions", 0),
        }


# Global instance
pipeline = TreatmentPipeline()
