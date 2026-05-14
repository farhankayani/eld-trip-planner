export type DutyStatus = 'OFF' | 'SLEEPER' | 'DRIVING' | 'ON_DUTY';

export interface TimelineEntry {
  status: DutyStatus;
  start_hour: number;
  end_hour: number;
  notes: string;
  location: string;
}

export interface DailyLog {
  day_index: number;
  log_date: string;
  off_duty_hours: number;
  sleeper_hours: number;
  driving_hours: number;
  on_duty_not_driving_hours: number;
  miles_today: number;
  starting_location: string;
  ending_location: string;
  shipper: string;
  commodity: string;
  load_no: string;
  timeline_entries: TimelineEntry[];
}

export interface TripSegment {
  sequence: number;
  status: DutyStatus;
  start_iso: string;
  end_iso: string;
  duration_hours: number;
  location_name: string;
  lat: number;
  lon: number;
  odometer_start: number;
  odometer_end: number;
  notes: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
  display_name: string;
}

export interface TripSummary {
  total_distance_miles: number;
  total_drive_hours: number;
  total_on_duty_hours: number;
  total_trip_hours: number;
  num_days: number;
  cycle_hours_remaining: number;
}

export interface TripPlanResponse {
  summary: TripSummary;
  geocoded: {
    current: GeoPoint;
    pickup: GeoPoint;
    dropoff: GeoPoint;
  };
  route_geometry: {
    current_to_pickup: [number, number][];
    pickup_to_dropoff: [number, number][];
  };
  segments: TripSegment[];
  daily_logs: DailyLog[];
}

export interface TripPlanRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: Record<string, string>;
  field?: string;
}
