"""
Reddit Scraper — Uses Reddit's free public JSON endpoint.
No API key required. No PRAW dependency.
"""

import time
from typing import List, Dict, Any
from datetime import datetime

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

HEADERS = {
    "User-Agent": "TreatmentIntelligencePlatform/2.0 (research; medical-insights)",
}

RATE_LIMIT_DELAY = 1.1  # Reddit asks for 1 req/sec


class RedditScraper:
    """Scrapes Reddit via public JSON endpoint — no API key needed."""

    def __init__(self):
        self.is_configured = HTTPX_AVAILABLE
        if self.is_configured:
            print("[RedditScraper] Ready ✓ (public JSON endpoint, no API key needed)")
        else:
            print("[RedditScraper] httpx not installed. Run: pip install httpx")

    def scrape_treatment(self, treatment_name: str, max_posts: int = 40) -> List[Dict[str, Any]]:
        if not self.is_configured:
            return []

        posts = []
        post_id = 1000
        treatment_lower = treatment_name.lower()

        print(f"[RedditScraper] Searching Reddit for '{treatment_name}'...")
        start = time.time()

        try:
            with httpx.Client(headers=HEADERS, timeout=15, follow_redirects=True) as client:
                # Search all of Reddit
                url = (
                    f"https://www.reddit.com/search.json"
                    f"?q={treatment_name}&sort=relevance&limit=25&t=year"
                )
                resp = client.get(url)
                if resp.status_code != 200:
                    print(f"[RedditScraper] Search returned {resp.status_code}")
                    return posts

                data = resp.json()
                children = data.get("data", {}).get("children", [])

                for child in children:
                    if len(posts) >= max_posts:
                        break

                    post_data = child.get("data", {})
                    text = (post_data.get("selftext") or "").strip()
                    title = post_data.get("title", "")

                    # Use title + body
                    full_text = f"{title}. {text}" if text else title

                    # Must mention the treatment and be long enough
                    if treatment_lower not in full_text.lower():
                        continue
                    if len(full_text) < 60:
                        continue
                    if len(full_text) > 1500:
                        full_text = full_text[:1500] + "..."

                    permalink = post_data.get("permalink", "")
                    created = post_data.get("created_utc", 0)
                    timestamp = datetime.fromtimestamp(created).strftime("%Y-%m-%d") if created else ""

                    posts.append({
                        "id": post_id,
                        "source": "Reddit",
                        "treatment": treatment_name,
                        "text": full_text,
                        "timestamp": timestamp,
                        "url": f"https://reddit.com{permalink}" if permalink else "",
                        "subreddit": post_data.get("subreddit", ""),
                        "score": post_data.get("score", 0),
                    })
                    post_id += 1

                    # Fetch top comments for this post
                    if permalink and len(posts) < max_posts:
                        time.sleep(RATE_LIMIT_DELAY)
                        try:
                            comment_url = f"https://www.reddit.com{permalink}.json?limit=10&sort=top"
                            cresp = client.get(comment_url)
                            if cresp.status_code == 200:
                                cdata = cresp.json()
                                if len(cdata) > 1:
                                    comments = cdata[1].get("data", {}).get("children", [])
                                    for comment in comments[:5]:
                                        if len(posts) >= max_posts:
                                            break
                                        ctext = comment.get("data", {}).get("body", "").strip()
                                        if len(ctext) < 60:
                                            continue
                                        if treatment_lower not in ctext.lower():
                                            continue
                                        if len(ctext) > 1000:
                                            ctext = ctext[:1000] + "..."

                                        c_created = comment.get("data", {}).get("created_utc", 0)
                                        c_ts = datetime.fromtimestamp(c_created).strftime("%Y-%m-%d") if c_created else ""

                                        posts.append({
                                            "id": post_id,
                                            "source": "Reddit",
                                            "treatment": treatment_name,
                                            "text": ctext,
                                            "timestamp": c_ts,
                                            "url": f"https://reddit.com{permalink}",
                                            "subreddit": post_data.get("subreddit", ""),
                                            "score": comment.get("data", {}).get("score", 0),
                                        })
                                        post_id += 1
                        except Exception:
                            pass

                    time.sleep(RATE_LIMIT_DELAY)

        except Exception as e:
            print(f"[RedditScraper] Error: {e}")

        elapsed = round(time.time() - start, 2)
        print(f"[RedditScraper] Found {len(posts)} posts for '{treatment_name}' in {elapsed}s")
        return posts


reddit_scraper = RedditScraper()
