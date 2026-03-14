"""
Drug Name Normalizer — RxNorm API from NIH.
No API key required. Normalizes brand names to generic (Ozempic → Semaglutide).
Caches results to data/drug_name_cache.json permanently.
"""

import os
import json
from typing import Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"
CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "drug_name_cache.json")


class DrugNormalizer:
    """Normalizes drug names using NIH RxNorm API with disk cache."""

    def __init__(self):
        self.cache = self._load_cache()
        self.is_available = HTTPX_AVAILABLE
        if self.is_available:
            print(f"[DrugNormalizer] Ready ✓ (RxNorm API, {len(self.cache)} cached names)")
        else:
            print("[DrugNormalizer] httpx not installed. Normalization disabled.")

    def _load_cache(self) -> dict:
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, "r") as f:
                    return json.load(f)
        except Exception:
            pass
        return {}

    def _save_cache(self):
        try:
            os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
            with open(CACHE_FILE, "w") as f:
                json.dump(self.cache, f, indent=2)
        except Exception:
            pass

    def normalize(self, term: str) -> str:
        """
        Normalize a drug name to its canonical generic name.
        Ozempic → Semaglutide, Advil → Ibuprofen, etc.
        Returns original term if not found.
        """
        if not term or len(term) < 2:
            return term

        key = term.lower().strip()

        # Check cache first
        if key in self.cache:
            return self.cache[key]

        if not self.is_available:
            return term

        # Hit RxNorm API
        canonical = self._lookup_rxnorm(term)
        if canonical:
            self.cache[key] = canonical
            self._save_cache()
            return canonical

        # Not found — cache the original to avoid re-querying
        self.cache[key] = term
        self._save_cache()
        return term

    def normalize_treatment_name(self, name: str) -> str:
        """Normalize the search query itself before scraping."""
        normalized = self.normalize(name)
        if normalized != name:
            print(f"[DrugNormalizer] Normalized '{name}' → '{normalized}'")
        return normalized

    def _lookup_rxnorm(self, term: str) -> Optional[str]:
        """Look up a drug name in RxNorm."""
        try:
            with httpx.Client(timeout=10) as client:
                # Step 1: Get RxCUI
                resp = client.get(
                    f"{RXNORM_BASE}/rxcui.json",
                    params={"name": term, "search": 2}
                )
                if resp.status_code != 200:
                    return None

                data = resp.json()
                id_group = data.get("idGroup", {})
                rxcui_list = id_group.get("rxnormId", [])

                if not rxcui_list:
                    return None

                rxcui = rxcui_list[0]

                # Step 2: Get canonical properties
                resp2 = client.get(f"{RXNORM_BASE}/rxcui/{rxcui}/properties.json")
                if resp2.status_code != 200:
                    return None

                props = resp2.json().get("properties", {})
                canonical = props.get("name", "")

                if canonical:
                    # Capitalize properly
                    return canonical.title()

        except Exception:
            pass

        return None


# Global instance
drug_normalizer = DrugNormalizer()
