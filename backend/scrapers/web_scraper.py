"""
Web Scraper — Drugs.com patient reviews.
Targets p.ddc-comment-content for review text.
No API key needed. Handles pagination (pages 1–5).
Filters reviews by treatment name mention and minimum length.
"""

import re
import time
from typing import List, Dict, Any

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

WEB_AVAILABLE = HTTPX_AVAILABLE and BS4_AVAILABLE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

BOILERPLATE_SKIP = [
    "sign in", "log in", "cookie", "privacy policy",
    "terms of use", "advertisement", "copyright",
    "report this", "was this review helpful",
]


class WebScraper:
    """Scrapes patient reviews from Drugs.com. No API key needed."""

    def __init__(self):
        self.is_configured = WEB_AVAILABLE
        if self.is_configured:
            print("[WebScraper] Ready ✓ (Drugs.com reviews, no key needed)")
        else:
            if not HTTPX_AVAILABLE:
                print("[WebScraper] httpx not installed. Run: pip install httpx")
            if not BS4_AVAILABLE:
                print("[WebScraper] beautifulsoup4 not installed. Run: pip install beautifulsoup4")

    def scrape_treatment(self, treatment_name: str, max_posts: int = 30) -> List[Dict[str, Any]]:
        if not self.is_configured:
            return []

        print(f"[WebScraper] Scraping Drugs.com for '{treatment_name}'...")
        start = time.time()

        posts = []
        post_id = 3000
        slug = treatment_name.lower().replace(" ", "-")
        treatment_lower = treatment_name.lower()

        try:
            with httpx.Client(headers=HEADERS, timeout=15, follow_redirects=True) as client:
                # Try pages 1–5
                for page in range(1, 6):
                    if len(posts) >= max_posts:
                        break

                    url = f"https://www.drugs.com/comments/{slug}/"
                    if page > 1:
                        url += f"?page={page}"

                    try:
                        resp = client.get(url)
                        if resp.status_code != 200:
                            break

                        soup = BeautifulSoup(resp.text, "html.parser")

                        # Primary selector — correct Drugs.com class
                        reviews = soup.select("p.ddc-comment-content")

                        # Fallback selectors if page structure changed
                        if not reviews:
                            reviews = soup.select("div.ddc-comment p")
                        if not reviews:
                            reviews = soup.select(".user-comment p")

                        # No reviews found on this page — stop paginating
                        if not reviews:
                            break

                        # Extract ratings if present
                        ratings = soup.select("div.ddc-rating")
                        rating_map = {}
                        for idx, r in enumerate(ratings):
                            rating_text = r.get_text(strip=True)
                            try:
                                val = float(re.search(r'(\d+\.?\d*)', rating_text).group(1))
                                rating_map[idx] = val
                            except (AttributeError, ValueError):
                                pass

                        for idx, review in enumerate(reviews):
                            if len(posts) >= max_posts:
                                break

                            text = review.get_text(strip=True)

                            # Minimum quality filter
                            if len(text) < 80:
                                continue

                            # Filter: must mention the treatment name
                            if treatment_lower not in text.lower():
                                continue

                            # Skip boilerplate
                            if any(skip in text.lower() for skip in BOILERPLATE_SKIP):
                                continue

                            if len(text) > 1500:
                                text = text[:1500] + "..."

                            post = {
                                "id": post_id,
                                "source": "Drugs.com",
                                "treatment": treatment_name,
                                "text": text,
                                "timestamp": "",
                                "url": url,
                            }

                            if idx in rating_map:
                                post["rating"] = rating_map[idx]

                            posts.append(post)
                            post_id += 1

                        time.sleep(1)

                    except Exception:
                        continue

        except Exception as e:
            print(f"[WebScraper] Error: {e}")

        elapsed = round(time.time() - start, 2)
        print(f"[WebScraper] Found {len(posts)} reviews for '{treatment_name}' in {elapsed}s")
        return posts


web_scraper = WebScraper()
