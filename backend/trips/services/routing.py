import math
import requests


class RoutingError(Exception):
    pass


def get_route(origin: dict, destination: dict) -> dict:
    """
    Get driving route between two geocoded points.
    Returns { distance_miles, duration_hours, coordinates: [[lon, lat], ...] }
    """
    lon1, lat1 = origin["lon"], origin["lat"]
    lon2, lat2 = destination["lon"], destination["lat"]

    try:
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{lon1},{lat1};{lon2},{lat2}"
            "?overview=full&geometries=geojson&steps=false"
        )
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            raise RoutingError(f"OSRM returned no route: {data.get('code')}")

        route = data["routes"][0]
        distance_miles = route["distance"] / 1609.344
        duration_hours = route["duration"] / 3600.0
        coordinates = route["geometry"]["coordinates"]  # list of [lon, lat]

        return {
            "distance_miles": distance_miles,
            "duration_hours": duration_hours,
            "coordinates": coordinates,
        }

    except requests.RequestException:
        # Fallback: straight-line with 1.3 factor and 55 mph average
        distance_miles = _haversine_miles(lat1, lon1, lat2, lon2) * 1.3
        duration_hours = distance_miles / 55.0
        coordinates = [[lon1, lat1], [lon2, lat2]]
        return {
            "distance_miles": distance_miles,
            "duration_hours": duration_hours,
            "coordinates": coordinates,
        }


def _haversine_miles(lat1, lon1, lat2, lon2) -> float:
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def interpolate_position(coordinates: list, fraction: float) -> tuple:
    """Return (lat, lon) at the given fraction (0-1) along a coordinate list."""
    if not coordinates or fraction <= 0:
        lon, lat = coordinates[0]
        return lat, lon
    if fraction >= 1:
        lon, lat = coordinates[-1]
        return lat, lon

    target_idx = fraction * (len(coordinates) - 1)
    lo = int(target_idx)
    hi = min(lo + 1, len(coordinates) - 1)
    t = target_idx - lo

    lon = coordinates[lo][0] + t * (coordinates[hi][0] - coordinates[lo][0])
    lat = coordinates[lo][1] + t * (coordinates[hi][1] - coordinates[lo][1])
    return lat, lon
