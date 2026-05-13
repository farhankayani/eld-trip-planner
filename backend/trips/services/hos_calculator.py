"""
FMCSA HOS Calculator for property-carrying drivers, 70hrs/8days cycle.

Rules enforced:
- 11-hour daily driving limit
- 14-hour on-duty window (resets after 10hr off-duty)
- 30-minute rest break required after 8 cumulative driving hours (only OFF_DUTY resets this)
- 70-hour/8-day rolling cycle
- 10-hour off-duty rest resets 11hr/14hr clocks
- 34-hour restart resets cycle to 0 (used automatically when cycle exhausted)
- Fuel stop every 1000 miles (0.5hr ON_DUTY)
- 1hr ON_DUTY for pickup, 1hr ON_DUTY for dropoff
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List

from .routing import interpolate_position


FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_HOURS = 0.5
PICKUP_HOURS = 1.0
DROPOFF_HOURS = 1.0
REST_BREAK_HOURS = 0.5         # 30 min mandatory break
DAILY_REST_HOURS = 10.0        # 10hr off-duty to reset 11hr/14hr
RESTART_HOURS = 34.0           # 34hr restart to reset 70hr cycle
MAX_DRIVING_PER_DAY = 11.0
MAX_WINDOW_HOURS = 14.0
MAX_CYCLE_HOURS = 70.0
BREAK_TRIGGER_HOURS = 8.0      # drive this many hours before mandatory break

EPSILON = 0.01  # hours — avoid infinite loops on tiny remainders


@dataclass
class Segment:
    sequence: int
    status: str          # 'OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY'
    start_time: datetime
    end_time: datetime
    duration_hours: float
    location_name: str
    lat: float
    lon: float
    odometer_start: float
    odometer_end: float
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "sequence": self.sequence,
            "status": self.status,
            "start_iso": self.start_time.isoformat(),
            "end_iso": self.end_time.isoformat(),
            "duration_hours": round(self.duration_hours, 4),
            "location_name": self.location_name,
            "lat": self.lat,
            "lon": self.lon,
            "odometer_start": round(self.odometer_start, 2),
            "odometer_end": round(self.odometer_end, 2),
            "notes": self.notes,
        }


@dataclass
class DriverState:
    current_time: datetime
    location_name: str
    lat: float
    lon: float

    driving_today: float = 0.0        # hours driven since last 10hr reset
    driving_since_break: float = 0.0  # hours driven since last ≥30min off-duty
    cycle_used: float = 0.0           # rolling 70hr counter
    window_start: datetime = None     # when current 14hr window began

    odometer: float = 0.0
    miles_since_fuel: float = 0.0

    segments: List[Segment] = field(default_factory=list)
    sequence: int = 0

    def window_elapsed(self) -> float:
        if self.window_start is None:
            return 0.0
        return (self.current_time - self.window_start).total_seconds() / 3600.0

    def add_segment(self, status: str, duration_hours: float, notes: str = "",
                    drive_miles: float = 0.0) -> None:
        seg = Segment(
            sequence=self.sequence,
            status=status,
            start_time=self.current_time,
            end_time=self.current_time + timedelta(hours=duration_hours),
            duration_hours=duration_hours,
            location_name=self.location_name,
            lat=self.lat,
            lon=self.lon,
            odometer_start=self.odometer,
            odometer_end=self.odometer + drive_miles,
            notes=notes,
        )
        self.segments.append(seg)
        self.sequence += 1
        self.current_time += timedelta(hours=duration_hours)
        if drive_miles:
            self.odometer += drive_miles

    def take_off_duty(self, hours: float, notes: str) -> None:
        self.add_segment("OFF", hours, notes)
        if hours >= DAILY_REST_HOURS:
            # Full rest: reset 11hr and 14hr window
            self.driving_today = 0.0
            self.window_start = self.current_time
        if hours >= REST_BREAK_HOURS:
            self.driving_since_break = 0.0
        self.cycle_used += hours  # off-duty counts toward cycle only if on-duty; actually OFF is exempt
        # Correction: off-duty time does NOT count toward 70hr cycle
        self.cycle_used -= hours  # undo — cycle only counts on-duty time

    def take_rest(self, hours: float, notes: str) -> None:
        """10-hour daily reset."""
        self.add_segment("OFF", hours, notes)
        self.driving_today = 0.0
        self.driving_since_break = 0.0
        self.window_start = self.current_time

    def take_restart(self) -> None:
        """34-hour restart — resets cycle to 0."""
        self.add_segment("OFF", RESTART_HOURS, "34-hr restart")
        self.driving_today = 0.0
        self.driving_since_break = 0.0
        self.cycle_used = 0.0
        self.window_start = self.current_time


def simulate(
    current: dict,
    pickup: dict,
    dropoff: dict,
    cycle_used: float,
    route_cp: dict,
    route_pd: dict,
) -> List[dict]:
    """
    Simulate the full trip timeline and return a list of segment dicts.
    """
    # Start at 08:00 UTC today
    now = datetime.now(timezone.utc)
    start_time = now.replace(hour=8, minute=0, second=0, microsecond=0)
    if start_time < now:
        start_time += timedelta(days=1)

    state = DriverState(
        current_time=start_time,
        location_name=current["display_name"],
        lat=current["lat"],
        lon=current["lon"],
        cycle_used=cycle_used,
        window_start=start_time,
    )

    # Check if cycle is already exhausted before we even start
    if state.cycle_used >= MAX_CYCLE_HOURS - EPSILON:
        state.take_restart()

    legs = [
        {
            "route": route_cp,
            "dest": pickup,
            "after_action": "PICKUP",
        },
        {
            "route": route_pd,
            "dest": dropoff,
            "after_action": "DROPOFF",
        },
    ]

    for leg in legs:
        route = leg["route"]
        dest = leg["dest"]
        after_action = leg["after_action"]

        total_miles = route["distance_miles"]
        total_hours = route["duration_hours"]
        # Guard against zero-distance legs
        if total_miles < 0.1:
            speed = 55.0
        else:
            speed = total_miles / max(total_hours, 0.1)

        miles_driven_this_leg = 0.0
        miles_remaining = total_miles

        while miles_remaining > EPSILON:
            # --- Compute binding constraint ---
            window_left = MAX_WINDOW_HOURS - state.window_elapsed()
            drive_cap_11hr = MAX_DRIVING_PER_DAY - state.driving_today
            drive_cap_14hr = window_left  # driving within window is also limited
            drive_cap_break = BREAK_TRIGGER_HOURS - state.driving_since_break
            drive_cap_cycle = MAX_CYCLE_HOURS - state.cycle_used
            drive_cap_fuel = FUEL_INTERVAL_MILES - state.miles_since_fuel

            # Convert hour-based caps to miles
            miles_cap_11hr = drive_cap_11hr * speed
            miles_cap_14hr = drive_cap_14hr * speed
            miles_cap_break = drive_cap_break * speed
            miles_cap_cycle = drive_cap_cycle * speed

            drive_miles = min(
                miles_remaining,
                miles_cap_11hr,
                miles_cap_14hr,
                miles_cap_break,
                miles_cap_cycle,
                drive_cap_fuel,
            )

            if drive_miles <= EPSILON:
                # Determine which constraint binds and resolve it
                if state.cycle_used >= MAX_CYCLE_HOURS - EPSILON:
                    state.take_restart()
                    state.location_name = _nearest_location(
                        route["coordinates"], miles_driven_this_leg, total_miles
                    )
                elif drive_cap_11hr <= EPSILON or window_left <= EPSILON:
                    # Must take 10hr rest
                    state.take_rest(DAILY_REST_HOURS, "Mandatory 10-hr rest")
                elif drive_cap_break <= EPSILON:
                    # 30-min mandatory break
                    state.add_segment("OFF", REST_BREAK_HOURS, "30-min mandatory break")
                    state.driving_since_break = 0.0
                else:
                    # Fuel stop triggered
                    loc = _nearest_location(route["coordinates"], miles_driven_this_leg, total_miles)
                    lat, lon = _interpolate_latlon(route["coordinates"], miles_driven_this_leg, total_miles)
                    state.location_name = loc
                    state.lat = lat
                    state.lon = lon
                    state.add_segment("ON_DUTY", FUEL_STOP_HOURS, "Fuel stop")
                    state.cycle_used += FUEL_STOP_HOURS
                    state.miles_since_fuel = 0.0
                continue

            # Drive!
            drive_hours = drive_miles / speed
            fraction_start = miles_driven_this_leg / total_miles if total_miles > 0 else 0
            fraction_end = (miles_driven_this_leg + drive_miles) / total_miles if total_miles > 0 else 0

            start_lat, start_lon = _interpolate_latlon(route["coordinates"], miles_driven_this_leg, total_miles)
            state.location_name = current["display_name"] if miles_driven_this_leg < 1 else f"En route ({fraction_start:.0%})"
            state.lat = start_lat
            state.lon = start_lon

            state.add_segment("DRIVING", drive_hours, "", drive_miles=drive_miles)
            state.driving_today += drive_hours
            state.driving_since_break += drive_hours
            state.cycle_used += drive_hours
            state.miles_since_fuel += drive_miles
            miles_driven_this_leg += drive_miles
            miles_remaining -= drive_miles

            # Update position to end of this drive segment
            end_lat, end_lon = _interpolate_latlon(route["coordinates"], miles_driven_this_leg, total_miles)
            state.lat = end_lat
            state.lon = end_lon

            # Fuel stop after driving?
            if state.miles_since_fuel >= FUEL_INTERVAL_MILES - EPSILON and miles_remaining > EPSILON:
                fuel_loc = _nearest_location(route["coordinates"], miles_driven_this_leg, total_miles)
                state.location_name = fuel_loc
                state.add_segment("ON_DUTY", FUEL_STOP_HOURS, "Fuel stop")
                state.cycle_used += FUEL_STOP_HOURS
                state.miles_since_fuel = 0.0

            # Mandatory break after 8hr driving?
            if state.driving_since_break >= BREAK_TRIGGER_HOURS - EPSILON and miles_remaining > EPSILON:
                state.add_segment("OFF", REST_BREAK_HOURS, "30-min mandatory break")
                state.driving_since_break = 0.0

        # Arrived at destination — update location
        state.location_name = dest["display_name"]
        state.lat = dest["lat"]
        state.lon = dest["lon"]

        # Apply after-action (pickup or dropoff)
        if after_action == "PICKUP":
            state.add_segment("ON_DUTY", PICKUP_HOURS, "Pickup")
            state.cycle_used += PICKUP_HOURS
        elif after_action == "DROPOFF":
            state.add_segment("ON_DUTY", DROPOFF_HOURS, "Dropoff")
            state.cycle_used += DROPOFF_HOURS

    # Fill remainder of last day with OFF_DUTY
    midnight = state.current_time.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    remaining = (midnight - state.current_time).total_seconds() / 3600.0
    if remaining > EPSILON:
        state.add_segment("OFF", remaining, "End of trip")

    return [seg.to_dict() for seg in state.segments]


def _nearest_location(coordinates: list, miles_into_leg: float, total_miles: float) -> str:
    if total_miles <= 0:
        return "En route"
    frac = min(miles_into_leg / total_miles, 1.0)
    return f"Mile {int(miles_into_leg)} en route"


def _interpolate_latlon(coordinates: list, miles_into_leg: float, total_miles: float):
    if not coordinates:
        return 0.0, 0.0
    frac = miles_into_leg / total_miles if total_miles > 0 else 0
    frac = max(0.0, min(1.0, frac))
    lat, lon = interpolate_position(coordinates, frac)
    return lat, lon
