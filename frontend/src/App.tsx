import { useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { planTrip } from './api/tripApi';
import { TripForm } from './components/TripForm/TripForm';
import { MapView } from './components/MapView/MapView';
import { TripSummary } from './components/TripSummary/TripSummary';
import { ELDLogList } from './components/ELDLogs/ELDLogList';
import type { TripPlanRequest, TripPlanResponse } from './types/trip';
import './index.css';

const queryClient = new QueryClient();

function AppInner() {
  const [result, setResult] = useState<TripPlanResponse | null>(null);

  const mutation = useMutation({
    mutationFn: planTrip,
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (data: TripPlanRequest) => {
    setResult(null);
    mutation.mutate(data);
  };

  const errorMessage = mutation.error
    ? (() => {
        const err = (mutation.error as any)?.response?.data;
        if (err?.message) return err.message;
        if (err?.details) return Object.values(err.details).join(' ');
        return 'An error occurred. Please try again.';
      })()
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚛</span>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">ELD Trip Planner</h1>
              <p className="text-xs text-gray-500">FMCSA HOS compliant route planning</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span>70hr/8-day cycle</span>
            <span>•</span>
            <span>Property carrier</span>
            <span>•</span>
            <span>Fuel every 1,000mi</span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: form */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <TripForm
              onSubmit={handleSubmit}
              isLoading={mutation.isPending}
              error={errorMessage}
            />
          </div>

          {/* Right panel: results */}
          <div className="flex-1 min-w-0">
            {!result && !mutation.isPending && (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">Ready to Plan Your Trip</h2>
                <p className="text-gray-500 text-sm max-w-sm">
                  Enter your current location, pickup, and dropoff to get a fully HOS-compliant route with ELD log sheets.
                </p>
              </div>
            )}

            {mutation.isPending && (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <p className="text-gray-700 font-semibold">Planning your route…</p>
                <p className="text-gray-500 text-sm mt-1">Geocoding locations and calculating HOS schedule</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                <TripSummary plan={result} />
                <MapView plan={result} />
                <ELDLogList logs={result.daily_logs} />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-8 py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        ELD Trip Planner • FMCSA HOS Regulations (April 2022) • Property-carrying drivers
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
