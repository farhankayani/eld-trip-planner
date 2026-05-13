import type { DailyLog } from '../../types/trip';
import { ELDCanvas } from './ELDCanvas';

interface Props {
  logs: DailyLog[];
}

export function ELDLogList({ logs }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        📋 ELD Daily Log Sheets
        <span className="text-sm font-normal text-gray-500">({logs.length} day{logs.length !== 1 ? 's' : ''})</span>
      </h2>
      <div className="space-y-5">
        {logs.map(log => (
          <ELDCanvas key={log.day_index} log={log} />
        ))}
      </div>
    </div>
  );
}
