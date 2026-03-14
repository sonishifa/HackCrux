"""
YouTube Scraper — Fetches treatment video comments via YouTube Data API v3.
Single search query per treatment (no hardcoded suffixes).
Filters comments by checking they mention the treatment name.
Requires YOUTUBE_API_KEY.
"""

import os
import time
from typing import List, Dict, Any

try:
    from googleapiclient.discovery import build
    YOUTUBE_API_AVAILABLE = True
except ImportError:
    YOUTUBE_API_AVAILABLE = False


class YouTubeScraper:
    """Scrapes YouTube comments. Requires YOUTUBE_API_KEY."""

    def __init__(self):
        self.youtube = None
        self.is_configured = False
        self._init_youtube()

    def _init_youtube(self):
        if not YOUTUBE_API_AVAILABLE:
            print("[YouTubeScraper] google-api-python-client not installed. Run: pip install google-api-python-client")
            return

        api_key = os.getenv("YOUTUBE_API_KEY", "")
        if not api_key:
            print("[YouTubeScraper] YOUTUBE_API_KEY not set. YouTube scraping disabled.")
            return

        try:
            self.youtube = build("youtube", "v3", developerKey=api_key)
            self.is_configured = True
            print("[YouTubeScraper] Connected to YouTube Data API v3 ✓")
        except Exception as e:
            print(f"[YouTubeScraper] Failed to connect: {e}")

    def scrape_treatment(self, treatment_name: str, max_posts: int = 40) -> List[Dict[str, Any]]:
        if not self.is_configured or not self.youtube:
            return []

        posts = []
        post_id = 5000
        treatment_lower = treatment_name.lower()

        print(f"[YouTubeScraper] Searching YouTube for '{treatment_name}'...")
        start = time.time()

        try:
            # Single search — let YouTube's relevance algorithm handle it
            # No hardcoded suffixes or template queries
            search_response = self.youtube.search().list(
                q=treatment_name,
                part="id,snippet",
                maxResults=8,
                type="video",
                relevanceLanguage="en",
            ).execute()

            video_data = {}
            for item in search_response.get("items", []):
                vid = item["id"].get("videoId")
                if vid:
                    video_data[vid] = item["snippet"].get("title", "")

            # Fetch comments for each video
            for video_id, video_title in video_data.items():
                if len(posts) >= max_posts:
                    break

                try:
                    comment_response = self.youtube.commentThreads().list(
                        part="snippet",
                        videoId=video_id,
                        maxResults=20,
                        order="relevance",
                        textFormat="plainText",
                    ).execute()

                    for item in comment_response.get("items", []):
                        if len(posts) >= max_posts:
                            break

                        snippet = item["snippet"]["topLevelComment"]["snippet"]
                        text = snippet.get("textDisplay", "").strip()

                        # Must mention treatment name (case-insensitive) — no hardcoded patterns
                        if treatment_lower not in text.lower():
                            continue

                        # Minimum meaningful length
                        if len(text) < 60:
                            continue

                        if len(text) > 1200:
                            text = text[:1200] + "..."

                        posts.append({
                            "id": post_id,
                            "source": "YouTube",
                            "treatment": treatment_name,
                            "text": text,
                            "timestamp": snippet.get("publishedAt", "")[:10],
                            "url": f"https://youtube.com/watch?v={video_id}",
                            "video_title": video_title,
                            "likes": snippet.get("likeCount", 0),
                        })
                        post_id += 1

                except Exception:
                    continue

        except Exception as e:
            print(f"[YouTubeScraper] Error: {e}")

        elapsed = round(time.time() - start, 2)
        print(f"[YouTubeScraper] Found {len(posts)} comments for '{treatment_name}' in {elapsed}s")
        return posts


youtube_scraper = YouTubeScraper()
