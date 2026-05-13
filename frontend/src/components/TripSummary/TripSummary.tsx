import type { TripPlanResponse } from '../../types/trip';

interface Props {
  plan: TripPlanResponse;
}

export function TripSummary({ plan }: Props) {
  const { summary, geocoded } = plan;

  const cards = [
    { icon: '🛣️', label: 'Total Distance', value: `${summary.total_distance_miles.toFixed(0)} mi`, color: 'blue' },
    { icon: '🚗', label: 'Drive Hours', value: `${summary.total_drive_hours.toFixed(1)} hrs`, color: 'green' },
    { icon: '📅', label: 'Trip Days', value: `${summary.num_days} day${summary.num_days !== 1 ? 's' : ''}`, color: 'purple' },
    { icon: '⏱️', label: 'Cycle Remaining', value: `${summary.cycle_hours_remaining.toFixed(1)} hrs`, color: summary.cycle_hours_remaining < 10 ? 'red' : 'amber' },
  ];

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    purple: 'bg-violet-50 border-violet-200 text-violet-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    red:    'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Trip Summary</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {geocoded.current.display_name.split(',').slice(0, 2).join(',')} →{' '}
            {geocoded.pickup.display_name.split(',').slice(0, 2).join(',')} →{' '}
            {geocoded.dropoff.display_name.split(',').slice(0, 2).join(',')}
          </p>
        </div>
        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
          HOS Compliant
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ icon, label, value, color }) => (
          <div
            key={label}
            className={`border rounded-xl p-3.5 ${colorMap[color]}`}
          >
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-lg font-bold leading-tight">{value}</div>
            <div className="text-xs opacity-80 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Stop timeline */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Route</p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
            <span className="font-medium">{geocoded.current.display_name.split(',').slice(0, 2).join(',').trim()}</span>
          </span>
          <span className="text-gray-400">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="font-medium">{geocoded.pickup.display_name.split(',').slice(0, 2).join(',').trim()}</span>
          </span>
          <span className="text-gray-400">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="font-medium">{geocoded.dropoff.display_name.split(',').slice(0, 2).join(',').trim()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
