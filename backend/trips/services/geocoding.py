import time
import requests


class GeocodingError(Exception):
    pass


_last_request_time = 0.0


def geocode(address: str) -> dict:
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": "ELD-Trip-Planner/1.0 (assessment)"},
            timeout=10,
        )
        _last_request_time = time.time()
        resp.raise_for_status()
        results = resp.json()
    except requests.RequestException as e:
        raise GeocodingError(f"Request failed for '{address}': {e}")

    if not results:
        raise GeocodingError(f"No geocoding results found for '{address}'")

    r = results[0]
    return {
        "lat": float(r["lat"]),
        "lon": float(r["lon"]),
        "display_name": r.get("display_name", address),
    }
