import { useState } from 'react';
import type { TripPlanRequest } from '../../types/trip';

interface Props {
  onSubmit: (data: TripPlanRequest) => void;
  isLoading: boolean;
  error: string | null;
}

export function TripForm({ onSubmit, isLoading, error }: Props) {
  const [form, setForm] = useState<TripPlanRequest>({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const fields: { key: keyof TripPlanRequest; label: string; placeholder: string; icon: string }[] = [
    { key: 'current_location', label: 'Current Location', placeholder: 'e.g. Chicago, IL', icon: '📍' },
    { key: 'pickup_location', label: 'Pickup Location', placeholder: 'e.g. Memphis, TN', icon: '📦' },
    { key: 'dropoff_location', label: 'Dropoff Location', placeholder: 'e.g. Dallas, TX', icon: '🏁' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🚛</span>
          <h1 className="text-xl font-bold text-gray-900">ELD Trip Planner</h1>
        </div>
        <p className="text-sm text-gray-500">FMCSA HOS compliant • 70hr/8-day rule</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map(({ key, label, placeholder, icon }) => (
          <div key={key}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {icon} {label}
            </label>
            <input
              type="text"
              value={form[key] as string}
              onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            ⏱️ Current Cycle Used (hrs)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={70}
              step={0.5}
              value={form.current_cycle_used}
              onChange={e => setForm(prev => ({ ...prev, current_cycle_used: parseFloat(e.target.value) }))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="w-16 text-center px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
              {form.current_cycle_used}h
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0h</span>
            <span className="text-amber-600 font-medium">{70 - form.current_cycle_used}h remaining</span>
            <span>70h</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Planning Route…
            </>
          ) : (
            <>🗺️ Plan My Trip</>
          )}
        </button>
      </form>

      {/* HOS Info */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">HOS Rules Applied</p>
        <div className="space-y-1.5 text-xs text-gray-600">
          {[
            ['🚗', '11-hour daily driving limit'],
            ['⏰', '14-hour on-duty window'],
            ['☕', '30-min break after 8hr driving'],
            ['😴', '10-hour rest between shifts'],
            ['⛽', 'Fuel stop every 1,000 miles'],
            ['📦', '1 hour pickup + 1 hour dropoff'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
