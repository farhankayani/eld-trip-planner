from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response

from .services.geocoding import geocode, GeocodingError
from .services.routing import get_route, RoutingError
from .services.hos_calculator import simulate
from .services.log_builder import build_daily_logs


class TripPlanView(APIView):
    def post(self, request):
        data = request.data

        current_location = data.get("current_location", "").strip()
        pickup_location = data.get("pickup_location", "").strip()
        dropoff_location = data.get("dropoff_location", "").strip()
        cycle_used_raw = data.get("current_cycle_used", 0)

        errors = {}
        if not current_location:
            errors["current_location"] = "Required."
        if not pickup_location:
            errors["pickup_location"] = "Required."
        if not dropoff_location:
            errors["dropoff_location"] = "Required."
        try:
            cycle_used = float(cycle_used_raw)
            if not (0 <= cycle_used <= 70):
                errors["current_cycle_used"] = "Must be between 0 and 70."
        except (TypeError, ValueError):
            errors["current_cycle_used"] = "Must be a number."

        if errors:
            return Response({"error": "VALIDATION_ERROR", "details": errors}, status=400)

        try:
            current = geocode(current_location)
        except GeocodingError as e:
            return Response({"error": "GEOCODE_FAILED", "message": str(e), "field": "current_location"}, status=400)
        try:
            pickup = geocode(pickup_location)
        except GeocodingError as e:
            return Response({"error": "GEOCODE_FAILED", "message": str(e), "field": "pickup_location"}, status=400)
        try:
            dropoff = geocode(dropoff_location)
        except GeocodingError as e:
            return Response({"error": "GEOCODE_FAILED", "message": str(e), "field": "dropoff_location"}, status=400)

        try:
            route_cp = get_route(current, pickup)
        except RoutingError as e:
            return Response({"error": "ROUTING_FAILED", "message": str(e)}, status=400)
        try:
            route_pd = get_route(pickup, dropoff)
        except RoutingError as e:
            return Response({"error": "ROUTING_FAILED", "message": str(e)}, status=400)

        segments = simulate(current, pickup, dropoff, cycle_used, route_cp, route_pd)
        daily_logs = build_daily_logs(segments)

        total_distance = route_cp["distance_miles"] + route_pd["distance_miles"]
        drive_segs = [s for s in segments if s["status"] == "DRIVING"]
        total_drive_hours = sum(s["duration_hours"] for s in drive_segs)
        on_duty_segs = [s for s in segments if s["status"] in ("DRIVING", "ON_DUTY")]
        total_on_duty_hours = sum(s["duration_hours"] for s in on_duty_segs)

        if segments:
            trip_start = datetime.fromisoformat(segments[0]["start_iso"])
            trip_end = datetime.fromisoformat(segments[-1]["end_iso"])
            total_trip_hours = (trip_end - trip_start).total_seconds() / 3600.0
        else:
            total_trip_hours = 0.0

        return Response({
            "summary": {
                "total_distance_miles": round(total_distance, 2),
                "total_drive_hours": round(total_drive_hours, 2),
                "total_on_duty_hours": round(total_on_duty_hours, 2),
                "total_trip_hours": round(total_trip_hours, 2),
                "num_days": len(daily_logs),
                "cycle_hours_remaining": round(max(0, 70 - cycle_used - total_on_duty_hours), 2),
            },
            "geocoded": {
                "current": current,
                "pickup": pickup,
                "dropoff": dropoff,
            },
            "route_geometry": {
                "current_to_pickup": route_cp["coordinates"],
                "pickup_to_dropoff": route_pd["coordinates"],
            },
            "segments": segments,
            "daily_logs": daily_logs,
        })
