"""
PubMed Scraper — Uses NIH eutils API for clinical evidence.
No API key required. Fetches abstracts and extracts confirmed side effects.
"""

import re
import time
from typing import List, Dict, Any, Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    from lxml import etree
    LXML_AVAILABLE = True
except ImportError:
    LXML_AVAILABLE = False
    # Fallback to xml.etree
    import xml.etree.ElementTree as etree

BASE_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
BASE_FETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
RATE_LIMIT = 0.4


class PubMedScraper:
    """Fetches PubMed abstracts and extracts clinical evidence. No API key needed."""

    def __init__(self):
        self.is_configured = HTTPX_AVAILABLE
        if self.is_configured:
            print("[PubMedScraper] Ready ✓ (NIH eutils API, no key needed)")
        else:
            print("[PubMedScraper] httpx not installed. Run: pip install httpx")

    def scrape_treatment(self, treatment_name: str, max_posts: int = 15) -> List[Dict[str, Any]]:
        """Fetch PubMed abstracts as posts for the NLP pipeline."""
        if not self.is_configured:
            return []

        print(f"[PubMedScraper] Searching PubMed for '{treatment_name}'...")
        start = time.time()

        # Step 1: Search for article IDs
        article_ids = self._search_articles(treatment_name, max_posts)
        if not article_ids:
            print(f"[PubMedScraper] No articles found for '{treatment_name}'")
            return []

        time.sleep(RATE_LIMIT)

        # Step 2: Fetch abstracts
        posts = self._fetch_abstracts(article_ids, treatment_name)

        elapsed = round(time.time() - start, 2)
        print(f"[PubMedScraper] Found {len(posts)} abstracts for '{treatment_name}' in {elapsed}s")
        return posts

    def get_evidence(self, treatment_name: str) -> Dict[str, Any]:
        """
        Get clinical evidence summary for a treatment.
        Returns confirmed side effects, study count, and top studies.
        """
        if not self.is_configured:
            return {"studies_count": 0, "confirmed_side_effects": [], "top_studies": []}

        article_ids = self._search_articles(treatment_name, max_results=10)
        if not article_ids:
            return {"studies_count": 0, "confirmed_side_effects": [], "top_studies": []}

        time.sleep(RATE_LIMIT)
        abstracts = self._fetch_abstracts(article_ids, treatment_name)

        # Extract confirmed side effects from abstracts
        confirmed_effects = set()
        top_studies = []

        for abstract in abstracts:
            text_lower = abstract["text"].lower()
            # Look for side effect mentions in clinical context
            effect_patterns = [
                r'(?:adverse|side)\s+effects?\s+(?:include|such as|were|are)\s+([^.]+)',
                r'(?:reported|experienced|observed)\s+([^.]*?(?:nausea|headache|fatigue|diarrhea|dizziness|pain|rash|vomiting|insomnia)[^.]*)',
                r'(?:common|frequent|associated)\s+(?:adverse|side)\s+(?:effects?|reactions?)\s+(?:include|were|are)\s+([^.]+)',
            ]
            for pattern in effect_patterns:
                matches = re.findall(pattern, text_lower)
                for match in matches:
                    # Extract individual effects
                    for effect in re.split(r',\s*|\s+and\s+|\s*;\s*', match):
                        effect = effect.strip()
                        if 3 < len(effect) < 40:
                            confirmed_effects.add(effect)

            # Build study reference
            if abstract.get("title"):
                top_studies.append({
                    "title": abstract["title"],
                    "url": abstract["url"],
                    "year": abstract.get("year", 0),
                    "journal": abstract.get("journal", ""),
                })

        return {
            "studies_count": len(abstracts),
            "confirmed_side_effects": list(confirmed_effects)[:20],
            "top_studies": top_studies[:5],
        }

    def _search_articles(self, treatment: str, max_results: int = 15) -> List[str]:
        """Search PubMed for article IDs related to a treatment."""
        try:
            with httpx.Client(timeout=15) as client:
                params = {
                    "db": "pubmed",
                    "term": f"{treatment} side effects",
                    "retmode": "json",
                    "retmax": max_results,
                    "sort": "relevance",
                }
                resp = client.get(BASE_SEARCH, params=params)
                if resp.status_code != 200:
                    return []

                data = resp.json()
                return data.get("esearchresult", {}).get("idlist", [])
        except Exception as e:
            print(f"[PubMedScraper] Search error: {e}")
            return []

    def _fetch_abstracts(self, article_ids: List[str], treatment: str) -> List[Dict[str, Any]]:
        """Fetch and parse PubMed abstracts."""
        posts = []
        post_id = 2000

        try:
            ids_str = ",".join(article_ids)
            with httpx.Client(timeout=20) as client:
                params = {
                    "db": "pubmed",
                    "id": ids_str,
                    "retmode": "xml",
                    "rettype": "abstract",
                }
                resp = client.get(BASE_FETCH, params=params)
                if resp.status_code != 200:
                    return posts

                # Parse XML
                if LXML_AVAILABLE:
                    root = etree.fromstring(resp.content)
                else:
                    root = etree.fromstring(resp.text)

                for article in root.findall(".//PubmedArticle"):
                    # Title
                    title_el = article.find(".//ArticleTitle")
                    title = title_el.text if title_el is not None and title_el.text else ""

                    # Abstract
                    abstract_parts = []
                    for abs_text in article.findall(".//AbstractText"):
                        if abs_text.text:
                            label = abs_text.get("Label", "")
                            if label:
                                abstract_parts.append(f"{label}: {abs_text.text}")
                            else:
                                abstract_parts.append(abs_text.text)

                    abstract = " ".join(abstract_parts)
                    if not abstract or len(abstract) < 50:
                        continue

                    # PMID
                    pmid_el = article.find(".//PMID")
                    pmid = pmid_el.text if pmid_el is not None and pmid_el.text else ""

                    # Year
                    year_el = article.find(".//PubDate/Year")
                    year = int(year_el.text) if year_el is not None and year_el.text else 0

                    # Journal
                    journal_el = article.find(".//Journal/Title")
                    journal = journal_el.text if journal_el is not None and journal_el.text else ""

                    full_text = f"{title}. {abstract}" if title else abstract
                    if len(full_text) > 2000:
                        full_text = full_text[:2000] + "..."

                    posts.append({
                        "id": post_id,
                        "source": "PubMed",
                        "treatment": treatment,
                        "text": full_text,
                        "title": title,
                        "timestamp": str(year) if year else "",
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else "",
                        "year": year,
                        "journal": journal,
                    })
                    post_id += 1

        except Exception as e:
            print(f"[PubMedScraper] Fetch error: {e}")

        return posts


pubmed_scraper = PubMedScraper()
