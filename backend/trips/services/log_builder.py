"""
Converts a list of trip segments into per-day ELD log sheet data.
Segments crossing midnight are split into two entries.
"""

from datetime import datetime, date, timedelta, timezone
from collections import defaultdict


STATUS_FIELD_MAP = {
    "OFF": "off_duty_hours",
    "SLEEPER": "sleeper_hours",
    "DRIVING": "driving_hours",
    "ON_DUTY": "on_duty_not_driving_hours",
}


def build_daily_logs(segments: list) -> list:
    """
    Takes segment dicts (from hos_calculator.simulate) and returns a list of
    daily log dicts ready for the API response and ELD canvas renderer.
    """
    # Group timeline entries by calendar date
    day_entries = defaultdict(list)  # date -> list of {status, start_hour, end_hour, ...}
    day_miles = defaultdict(float)
    day_locations = {}  # date -> {start_location, end_location}

    for seg in segments:
        start_dt = datetime.fromisoformat(seg["start_iso"])
        end_dt = datetime.fromisoformat(seg["end_iso"])

        # Handle segments that cross midnight
        _split_segment_into_days(seg, start_dt, end_dt, day_entries, day_miles, day_locations)

    if not day_entries:
        return []

    all_dates = sorted(day_entries.keys())
    trip_start_date = all_dates[0]
    daily_logs = []

    for log_date in all_dates:
        entries = day_entries[log_date]

        # Fill any uncovered hours with OFF_DUTY so each day sums to 24h
        sorted_entries = sorted(entries, key=lambda x: x["start_hour"])
        filled: list = []
        cursor = 0.0
        for e in sorted_entries:
            if e["start_hour"] > cursor + 0.001:
                filled.append({"status": "OFF", "start_hour": cursor, "end_hour": e["start_hour"], "notes": "", "location": ""})
            filled.append(e)
            cursor = e["end_hour"]
        if cursor < 24.0 - 0.001:
            filled.append({"status": "OFF", "start_hour": cursor, "end_hour": 24.0, "notes": "", "location": ""})
        entries = filled
        day_entries[log_date] = filled

        day_index = (log_date - trip_start_date).days

        totals = {"OFF": 0.0, "SLEEPER": 0.0, "DRIVING": 0.0, "ON_DUTY": 0.0}
        for e in entries:
            totals[e["status"]] += e["end_hour"] - e["start_hour"]

        locs = day_locations.get(log_date, {})
        daily_logs.append({
            "day_index": day_index,
            "log_date": log_date.isoformat(),
            "off_duty_hours": round(totals["OFF"], 4),
            "sleeper_hours": round(totals["SLEEPER"], 4),
            "driving_hours": round(totals["DRIVING"], 4),
            "on_duty_not_driving_hours": round(totals["ON_DUTY"], 4),
            "miles_today": round(day_miles[log_date], 2),
            "starting_location": locs.get("start", ""),
            "ending_location": locs.get("end", ""),
            "timeline_entries": [
                {
                    "status": e["status"],
                    "start_hour": round(e["start_hour"], 4),
                    "end_hour": round(e["end_hour"], 4),
                    "notes": e.get("notes", ""),
                    "location": e.get("location", ""),
                }
                for e in sorted(entries, key=lambda x: x["start_hour"])
            ],
        })

    return daily_logs


def _split_segment_into_days(seg, start_dt, end_dt, day_entries, day_miles, day_locations):
    """
    Splits a segment that may span midnight into per-day timeline entries.
    """
    current_dt = start_dt

    while current_dt < end_dt:
        # Find midnight at end of current day
        day = current_dt.date()
        midnight = datetime(day.year, day.month, day.day, tzinfo=current_dt.tzinfo) + timedelta(days=1)
        chunk_end = min(end_dt, midnight)

        day_start = datetime(day.year, day.month, day.day, tzinfo=current_dt.tzinfo)
        start_hour = (current_dt - day_start).total_seconds() / 3600.0
        end_hour = (chunk_end - day_start).total_seconds() / 3600.0

        # Clamp
        start_hour = max(0.0, min(24.0, start_hour))
        end_hour = max(0.0, min(24.0, end_hour))

        if end_hour > start_hour:
            day_entries[day].append({
                "status": seg["status"],
                "start_hour": start_hour,
                "end_hour": end_hour,
                "notes": seg.get("notes", ""),
                "location": seg.get("location_name", ""),
            })

            # Track driving miles per day
            if seg["status"] == "DRIVING":
                seg_total_hours = (end_dt - start_dt).total_seconds() / 3600.0
                chunk_hours = end_hour - start_hour
                fraction = chunk_hours / seg_total_hours if seg_total_hours > 0 else 0
                total_miles = seg["odometer_end"] - seg["odometer_start"]
                day_miles[day] += total_miles * fraction

            # Track starting/ending locations per day
            if day not in day_locations:
                day_locations[day] = {"start": seg.get("location_name", ""), "end": ""}
            day_locations[day]["end"] = seg.get("location_name", "")

        current_dt = chunk_end
