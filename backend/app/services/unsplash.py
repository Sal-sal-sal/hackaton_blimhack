import hashlib
import os
from urllib.parse import quote

import httpx

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# In-memory cache: cache_key → photo URL
_photo_cache: dict[str, str | None] = {}


def _hash_heading(s: str) -> int:
    """Deterministic heading (0-359) from a string."""
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % 360


async def _streetview_available(location: str) -> bool:
    """Check if Street View panorama exists at location."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/streetview/metadata",
                params={"location": location, "key": GOOGLE_MAPS_API_KEY},
            )
            resp.raise_for_status()
            return resp.json().get("status") == "OK"
    except Exception:
        return False


async def get_city_photo(city: str, employer: str | None = None) -> str | None:
    """Return a background photo URL for a vacancy location.

    Each employer+city combo gets a unique Street View heading so that
    even vacancies in the same city show different images.

    Priority:
    1. Google Street View Static API (if GOOGLE_MAPS_API_KEY is set)
    2. Unsplash API (if UNSPLASH_ACCESS_KEY is set)
    3. LoremFlickr fallback (free, no key needed)
    """
    cache_key = f"{employer or ''}|{city}".strip().lower()

    if cache_key in _photo_cache:
        return _photo_cache[cache_key]

    # 1. Google Street View Static API
    if GOOGLE_MAPS_API_KEY:
        # Try employer+city first for a specific building, then city alone
        candidates = []
        if employer:
            candidates.append(f"{employer}, {city}")
        candidates.append(city)

        for location_query in candidates:
            if await _streetview_available(location_query):
                heading = _hash_heading(cache_key)
                url = (
                    "https://maps.googleapis.com/maps/api/streetview"
                    f"?size=800x1200"
                    f"&location={quote(location_query)}"
                    f"&heading={heading}"
                    f"&fov=90&pitch=10"
                    f"&key={GOOGLE_MAPS_API_KEY}"
                )
                _photo_cache[cache_key] = url
                return url

    # 2. Unsplash API
    if UNSPLASH_ACCESS_KEY:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.unsplash.com/search/photos",
                    params={
                        "query": f"{city} city",
                        "per_page": 1,
                        "orientation": "portrait",
                    },
                    headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
                )
                resp.raise_for_status()
                data = resp.json()

            results = data.get("results", [])
            if results:
                photo_url = results[0]["urls"].get("regular")
                _photo_cache[cache_key] = photo_url
                return photo_url
        except Exception:
            pass

    # 3. Fallback: loremflickr
    url = f"https://loremflickr.com/800/1200/{quote(city)},city,skyline"
    _photo_cache[cache_key] = url
    return url
