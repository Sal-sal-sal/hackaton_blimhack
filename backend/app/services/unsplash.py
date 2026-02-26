import os
from functools import lru_cache

import httpx

UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")

# In-memory cache: city name → photo URL
_city_photo_cache: dict[str, str | None] = {}


async def get_city_photo(city: str) -> str | None:
    """Fetch a landscape photo of a city. Uses Unsplash API if key is set, otherwise loremflickr fallback."""
    normalized = city.strip().lower()
    if normalized in _city_photo_cache:
        return _city_photo_cache[normalized]

    # Try Unsplash API first (if key is configured)
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
                url = results[0]["urls"].get("regular")
                _city_photo_cache[normalized] = url
                return url
        except Exception:
            pass

    # Fallback: loremflickr — free, no API key, returns a random city photo
    from urllib.parse import quote
    url = f"https://loremflickr.com/800/1200/{quote(city)},city,skyline"
    _city_photo_cache[normalized] = url
    return url
