import axios from 'axios';
import type { TripPlanRequest, TripPlanResponse } from '../types/trip';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

export async function planTrip(data: TripPlanRequest): Promise<TripPlanResponse> {
  const res = await api.post<TripPlanResponse>('/api/trip/plan', data);
  return res.data;
}
