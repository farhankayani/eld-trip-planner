import { useEffect, useRef } from 'react';
import type { DailyLog, DutyStatus } from '../../types/trip';

interface Props {
  log: DailyLog;
}

const CANVAS_W = 960;
const CANVAS_H = 500;

const LABEL_W = 130;
const GRID_X = LABEL_W;
const GRID_W = CANVAS_W - LABEL_W - 20;
const GRID_Y = 110;
const ROW_H = 56;
const GRID_H = ROW_H * 4;
const HR_W = GRID_W / 24;

const STATUS_ROW: Record<DutyStatus, number> = {
  OFF: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
};

const STATUS_COLOR: Record<DutyStatus, string> = {
  OFF: '#bfdbfe',
  SLEEPER: '#ddd6fe',
  DRIVING: '#bbf7d0',
  ON_DUTY: '#fed7aa',
};

const STATUS_DARK: Record<DutyStatus, string> = {
  OFF: '#1d4ed8',
  SLEEPER: '#6d28d9',
  DRIVING: '#15803d',
  ON_DUTY: '#c2410c',
};

const ROW_LABELS = ['1. Off Duty', '2. Sleeper Berth', '3. Driving', '4. On Duty\n(Not Driving)'];

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function ELDCanvas({ log }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // === HEADER ===
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, 0, CANVAS_W, 72);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText("Driver's Daily Log", 16, 20);

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('Property-carrying driver • 70hr/8-day cycle', 16, 38);

    // Date
    const dateStr = new Date(log.log_date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Day ${log.day_index + 1}  •  ${dateStr}`, CANVAS_W - 16, 20);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`${log.miles_today.toFixed(0)} miles today`, CANVAS_W - 16, 38);
    ctx.textAlign = 'left';

    // Location bar
    ctx.fillStyle = '#f0f7ff';
    ctx.fillRect(0, 72, CANVAS_W, 32);
    ctx.fillStyle = '#374151';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`From: ${log.starting_location}`, 12, 88);
    ctx.textAlign = 'right';
    ctx.fillText(`To: ${log.ending_location}`, CANVAS_W - 12, 88);
    ctx.textAlign = 'left';

    // === HOUR LABELS (top of grid) ===
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px monospace';
    ctx.textBaseline = 'bottom';
    const hourLabels = ['M', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'N', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'M'];
    for (let h = 0; h <= 24; h++) {
      const x = GRID_X + h * HR_W;
      const label = hourLabels[h];
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, x - tw / 2, GRID_Y - 4);
    }

    // AM/PM labels
    ctx.font = '8px system-ui, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.fillText('Mid', GRID_X, GRID_Y - 14);
    ctx.fillText('night', GRID_X, GRID_Y - 6);
    ctx.fillText('Noon', GRID_X + 12 * HR_W, GRID_Y - 10);
    ctx.fillText('Mid', GRID_X + 24 * HR_W, GRID_Y - 14);
    ctx.fillText('night', GRID_X + 24 * HR_W, GRID_Y - 6);
    ctx.textAlign = 'left';

    // === GRID BACKGROUND ===
    // Alternate row shading
    for (let row = 0; row < 4; row++) {
      const y = GRID_Y + row * ROW_H;
      ctx.fillStyle = row % 2 === 0 ? '#f9fafb' : '#ffffff';
      ctx.fillRect(GRID_X, y, GRID_W, ROW_H);
    }

    // === ROW LABELS ===
    const labelColors: Record<DutyStatus, string> = {
      OFF: '#1d4ed8', SLEEPER: '#6d28d9', DRIVING: '#15803d', ON_DUTY: '#c2410c',
    };
    const statuses: DutyStatus[] = ['OFF', 'SLEEPER', 'DRIVING', 'ON_DUTY'];

    for (let row = 0; row < 4; row++) {
      const y = GRID_Y + row * ROW_H;
      ctx.fillStyle = STATUS_COLOR[statuses[row]];
      ctx.fillRect(0, y, LABEL_W - 4, ROW_H);

      ctx.fillStyle = labelColors[statuses[row]];
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      const lines = ROW_LABELS[row].split('\n');
      const startY = y + (ROW_H - lines.length * 13) / 2;
      lines.forEach((line, li) => {
        ctx.fillText(line, 6, startY + li * 13);
      });
    }

    // === VERTICAL HOUR LINES ===
    for (let h = 0; h <= 24; h++) {
      const x = GRID_X + h * HR_W;
      ctx.strokeStyle = h % 6 === 0 ? '#9ca3af' : h % 2 === 0 ? '#e5e7eb' : '#f3f4f6';
      ctx.lineWidth = h % 6 === 0 ? 1.2 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, GRID_Y);
      ctx.lineTo(x, GRID_Y + GRID_H);
      ctx.stroke();
    }

    // === STATUS BARS ===
    for (const entry of log.timeline_entries) {
      const row = STATUS_ROW[entry.status as DutyStatus];
      const x1 = GRID_X + entry.start_hour * HR_W;
      const x2 = GRID_X + entry.end_hour * HR_W;
      const y = GRID_Y + row * ROW_H;
      const barW = Math.max(x2 - x1, 1);
      const barPad = 4;

      // Filled bar
      ctx.fillStyle = STATUS_COLOR[entry.status as DutyStatus];
      ctx.fillRect(x1, y + barPad, barW, ROW_H - barPad * 2);

      // Bar border
      ctx.strokeStyle = STATUS_DARK[entry.status as DutyStatus];
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x1, y + barPad, barW, ROW_H - barPad * 2);

      // Tick lines at entry/exit through full row height
      ctx.strokeStyle = STATUS_DARK[entry.status as DutyStatus];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1, y + ROW_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y);
      ctx.lineTo(x2, y + ROW_H);
      ctx.stroke();
    }

    // === GRID BORDER ===
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GRID_X, GRID_Y, GRID_W, GRID_H);

    // Horizontal row dividers
    for (let row = 1; row < 4; row++) {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(GRID_X, GRID_Y + row * ROW_H);
      ctx.lineTo(GRID_X + GRID_W, GRID_Y + row * ROW_H);
      ctx.stroke();
    }

    // Label area left border
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(GRID_X, GRID_Y);
    ctx.lineTo(GRID_X, GRID_Y + GRID_H);
    ctx.stroke();

    // === TOTALS SECTION ===
    const totalsY = GRID_Y + GRID_H + 14;
    const totals = [
      { label: 'Off Duty', hours: log.off_duty_hours, status: 'OFF' as DutyStatus },
      { label: 'Sleeper Berth', hours: log.sleeper_hours, status: 'SLEEPER' as DutyStatus },
      { label: 'Driving', hours: log.driving_hours, status: 'DRIVING' as DutyStatus },
      { label: 'On Duty (Not Driving)', hours: log.on_duty_not_driving_hours, status: 'ON_DUTY' as DutyStatus },
    ];
    const totalColW = (CANVAS_W - 20) / 4;

    totals.forEach(({ label, hours, status }, i) => {
      const x = 10 + i * totalColW;
      ctx.fillStyle = STATUS_COLOR[status];
      drawRoundRect(ctx, x, totalsY, totalColW - 8, 42, 6);
      ctx.fill();

      ctx.fillStyle = STATUS_DARK[status];
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(label.toUpperCase(), x + 8, totalsY + 6);

      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`${hours.toFixed(2)}h`, x + 8, totalsY + 18);
    });

    // Total check
    const grandTotal = log.off_duty_hours + log.sleeper_hours + log.driving_hours + log.on_duty_not_driving_hours;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Total: ${grandTotal.toFixed(2)} hrs`, CANVAS_W - 10, totalsY + 46);
    ctx.textAlign = 'left';

    // === REMARKS ===
    const remarksY = totalsY + 60;
    ctx.fillStyle = '#1e3a5f';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('REMARKS:', 10, remarksY);

    ctx.fillStyle = '#374151';
    ctx.font = '10px system-ui, sans-serif';

    // Collect notable events
    const remarks: string[] = [];
    for (const entry of log.timeline_entries) {
      if (entry.notes) {
        const time = `${Math.floor(entry.start_hour).toString().padStart(2, '0')}:${String(Math.round((entry.start_hour % 1) * 60)).padStart(2, '0')}`;
        remarks.push(`${time} — ${entry.notes}${entry.location ? ` at ${entry.location}` : ''}`);
      }
    }
    if (remarks.length === 0) {
      remarks.push(`Driving from ${log.starting_location} to ${log.ending_location}`);
    }

    remarks.slice(0, 4).forEach((r, i) => {
      ctx.fillText(r, 80, remarksY + i * 14);
    });

    // Bottom border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 1);
    ctx.lineTo(CANVAS_W, CANVAS_H - 1);
    ctx.stroke();

  }, [log]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `eld-log-day-${log.day_index + 1}-${log.log_date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      <canvas ref={canvasRef} className="w-full" />
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Day {log.day_index + 1} • {log.log_date} • {log.miles_today.toFixed(0)} miles
        </span>
        <button
          onClick={handleDownload}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
        >
          ⬇️ Download PNG
        </button>
      </div>
    </div>
  );
}
