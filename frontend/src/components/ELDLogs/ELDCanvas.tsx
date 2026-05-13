import { useEffect, useRef } from 'react';
import type { DailyLog, DutyStatus } from '../../types/trip';

interface Props {
  log: DailyLog;
}

// Canvas logical dimensions
const W = 900;
const H = 620;

// Header / info box area
const INFO_H = 110;

// Grid area
const LABEL_X = 0;
const LABEL_W = 148;
const GRID_X = LABEL_W;
const GRID_RIGHT_MARGIN = 52; // space for "Total Hours" column
const GRID_W = W - LABEL_W - GRID_RIGHT_MARGIN;
const GRID_Y = INFO_H + 36; // room for hour labels above grid
const ROW_H = 38;
const GRID_H = ROW_H * 4;
const HR_W = GRID_W / 24;

// Remarks / recap below grid
const REMARKS_Y = GRID_Y + GRID_H + 14;

const STATUS_ROW: Record<DutyStatus, number> = {
  OFF: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
};

const ROW_LABELS = [
  '1. Off Duty',
  '2. Sleeper\n   Berth',
  '3. Driving',
  '4. On Duty\n   (Not Driving)',
];

export function ELDCanvas({ log }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // ── White background ──────────────────────────────────────────────
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // ── HEADER ROW ────────────────────────────────────────────────────
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // Title
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.fillText("Driver's Daily Log", 8, 6);

    ctx.font = '9px Arial, sans-serif';
    ctx.fillText('(24 hours)', 8, 22);

    // Date line: ___ / ___ / ___   (month) (day) (year)
    const dateObj = new Date(log.log_date + 'T12:00:00');
    const month = String(dateObj.getMonth() + 1);
    const day = String(dateObj.getDate());
    const year = String(dateObj.getFullYear());

    ctx.font = '10px Arial, sans-serif';
    ctx.fillText(`${month}   /   ${day}   /   ${year}`, 220, 6);
    ctx.font = '8px Arial, sans-serif';
    ctx.fillText('(month)', 218, 18);
    ctx.fillText('(day)', 250, 18);
    ctx.fillText('(year)', 278, 18);

    // Original / Duplicate notice
    ctx.font = '8px Arial, sans-serif';
    ctx.fillText('Original - File at home terminal.', 530, 6);
    ctx.fillText('Duplicate - Driver retains in his/her possession for 8 days.', 530, 16);

    // Horizontal line under title row
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(W, 30);
    ctx.stroke();

    // From / To
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.fillText('From:', 8, 34);
    ctx.fillText('To:', 460, 34);

    ctx.font = '10px Arial, sans-serif';
    ctx.fillText(log.starting_location || '', 40, 34);
    ctx.fillText(log.ending_location || '', 476, 34);

    ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(W, 48); ctx.stroke();

    // Info boxes row 1: Total Miles Driving Today | Total Mileage Today | Name of Carrier
    const boxY1 = 50;
    const boxH = 22;

    // box borders
    ctx.strokeRect(6, boxY1, 100, boxH);
    ctx.strokeRect(112, boxY1, 100, boxH);
    ctx.strokeRect(240, boxY1, W - 246, boxH);

    ctx.font = '7.5px Arial, sans-serif';
    ctx.fillText('Total Miles Driving Today', 8, boxY1 + 2);
    ctx.fillText('Total Mileage Today', 114, boxY1 + 2);
    ctx.fillText('Name of Carrier or Carriers', 242, boxY1 + 2);

    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText(String(Math.round(log.miles_today)), 40, boxY1 + 11);

    ctx.beginPath(); ctx.moveTo(0, boxY1 + boxH + 2); ctx.lineTo(W, boxY1 + boxH + 2); ctx.stroke();

    // Info boxes row 2: Truck/Tractor | License Plates | Main Office | Home Terminal
    const boxY2 = 76;
    ctx.strokeRect(6, boxY2, 210, boxH);
    ctx.strokeRect(222, boxY2, 190, boxH);
    ctx.strokeRect(418, boxY2, W - 424, boxH);

    ctx.font = '7.5px Arial, sans-serif';
    ctx.fillText('Truck/Tractor and Trailer Numbers or', 8, boxY2 + 2);
    ctx.fillText("License Plate(s)/State (show each unit)", 8, boxY2 + 10);
    ctx.fillText('Main Office Address', 224, boxY2 + 2);
    ctx.fillText('Home Terminal Address', 420, boxY2 + 2);

    ctx.beginPath(); ctx.moveTo(0, boxY2 + boxH + 2); ctx.lineTo(W, boxY2 + boxH + 2); ctx.stroke();

    // ── HOUR LABELS ABOVE GRID ─────────────────────────────────────────
    const labelRowY = GRID_Y - 20;

    // "Mid-night" at start, "Noon" at 12, "Mid-night" at end
    ctx.font = 'bold 7px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mid-', GRID_X, labelRowY - 8);
    ctx.fillText('night', GRID_X, labelRowY - 1);
    ctx.fillText('Noon', GRID_X + 12 * HR_W, labelRowY - 4);
    ctx.fillText('Mid-', GRID_X + 24 * HR_W, labelRowY - 8);
    ctx.fillText('night', GRID_X + 24 * HR_W, labelRowY - 1);

    // Hour numbers 1-11 AM, 1-11 PM
    ctx.font = '8px Arial, sans-serif';
    const hourNums = ['', '1','2','3','4','5','6','7','8','9','10','11','','1','2','3','4','5','6','7','8','9','10','11',''];
    for (let h = 0; h < 25; h++) {
      const x = GRID_X + h * HR_W;
      if (hourNums[h]) ctx.fillText(hourNums[h], x, labelRowY);
    }

    // "Total Hours" header
    ctx.textAlign = 'center';
    ctx.font = 'bold 7.5px Arial, sans-serif';
    ctx.fillText('Total', GRID_X + GRID_W + GRID_RIGHT_MARGIN / 2, GRID_Y - 12);
    ctx.fillText('Hours', GRID_X + GRID_W + GRID_RIGHT_MARGIN / 2, GRID_Y - 4);

    ctx.textAlign = 'left';

    // ── GRID ───────────────────────────────────────────────────────────

    // Row backgrounds (white)
    ctx.fillStyle = '#fff';
    ctx.fillRect(GRID_X, GRID_Y, GRID_W, GRID_H);

    // Vertical hour lines with tick subdivisions
    for (let h = 0; h <= 24; h++) {
      const x = GRID_X + h * HR_W;
      const isMajor = h % 6 === 0;
      const isHour = true;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = isMajor ? 1.2 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, GRID_Y);
      ctx.lineTo(x, GRID_Y + GRID_H);
      ctx.stroke();

      // Sub-tick marks (15-min intervals) — small ticks at top & bottom of each row
      if (isHour && h < 24) {
        for (let q = 1; q <= 3; q++) {
          const qx = x + (q / 4) * HR_W;
          ctx.lineWidth = 0.4;
          ctx.strokeStyle = '#555';
          for (let row = 0; row < 4; row++) {
            const ry = GRID_Y + row * ROW_H;
            const tickH = q === 2 ? 10 : 6; // half-hour tick taller
            // top tick
            ctx.beginPath(); ctx.moveTo(qx, ry); ctx.lineTo(qx, ry + tickH); ctx.stroke();
            // bottom tick
            ctx.beginPath(); ctx.moveTo(qx, ry + ROW_H); ctx.lineTo(qx, ry + ROW_H - tickH); ctx.stroke();
          }
        }
      }
    }

    // Horizontal row dividers
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.8;
    for (let row = 0; row <= 4; row++) {
      const y = GRID_Y + row * ROW_H;
      ctx.beginPath();
      ctx.moveTo(GRID_X, y);
      ctx.lineTo(GRID_X + GRID_W, y);
      ctx.stroke();
    }

    // ── ROW LABELS (left side) ─────────────────────────────────────────
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.8;
    // outer border for label area
    ctx.strokeRect(LABEL_X, GRID_Y, LABEL_W, GRID_H);

    ctx.font = '9px Arial, sans-serif';
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    for (let row = 0; row < 4; row++) {
      const cy = GRID_Y + row * ROW_H + ROW_H / 2;
      const lines = ROW_LABELS[row].split('\n');
      if (lines.length === 1) {
        ctx.fillText(lines[0], LABEL_X + 4, cy);
      } else {
        ctx.fillText(lines[0], LABEL_X + 4, cy - 6);
        ctx.fillText(lines[1], LABEL_X + 4, cy + 6);
      }
      // row divider in label area
      if (row > 0) {
        ctx.beginPath();
        ctx.moveTo(LABEL_X, GRID_Y + row * ROW_H);
        ctx.lineTo(LABEL_X + LABEL_W, GRID_Y + row * ROW_H);
        ctx.stroke();
      }
    }

    // ── TOTAL HOURS column (right of grid) ────────────────────────────
    const totalsX = GRID_X + GRID_W;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(totalsX, GRID_Y, GRID_RIGHT_MARGIN, GRID_H);
    for (let row = 1; row < 4; row++) {
      ctx.beginPath();
      ctx.moveTo(totalsX, GRID_Y + row * ROW_H);
      ctx.lineTo(totalsX + GRID_RIGHT_MARGIN, GRID_Y + row * ROW_H);
      ctx.stroke();
    }

    const totalsHours = [
      log.off_duty_hours,
      log.sleeper_hours,
      log.driving_hours,
      log.on_duty_not_driving_hours,
    ];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillStyle = '#000';
    for (let row = 0; row < 4; row++) {
      ctx.fillText(
        totalsHours[row].toFixed(2),
        totalsX + GRID_RIGHT_MARGIN / 2,
        GRID_Y + row * ROW_H + ROW_H / 2,
      );
    }
    ctx.textAlign = 'left';

    // ── STATUS BARS (solid black line through vertical center of row) ──
    // Matches real ELD form: a horizontal line drawn through the midpoint
    ctx.strokeStyle = '#000';
    for (const entry of log.timeline_entries) {
      const row = STATUS_ROW[entry.status as DutyStatus];
      const x1 = GRID_X + entry.start_hour * HR_W;
      const x2 = GRID_X + entry.end_hour * HR_W;
      const midY = GRID_Y + row * ROW_H + ROW_H / 2;

      // Horizontal status line
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, midY);
      ctx.lineTo(x2, midY);
      ctx.stroke();

      // Vertical connectors at transitions (drop lines to next row or edge)
      ctx.lineWidth = 1.5;
      // left vertical line from top to bottom of row at start
      ctx.beginPath();
      ctx.moveTo(x1, GRID_Y + row * ROW_H);
      ctx.lineTo(x1, GRID_Y + row * ROW_H + ROW_H);
      ctx.stroke();
      // right vertical line
      ctx.beginPath();
      ctx.moveTo(x2, GRID_Y + row * ROW_H);
      ctx.lineTo(x2, GRID_Y + row * ROW_H + ROW_H);
      ctx.stroke();
    }

    // Draw transition connectors between consecutive entries
    const sorted = [...log.timeline_entries].sort((a, b) => a.start_hour - b.start_hour);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const cur = sorted[i];
      const nxt = sorted[i + 1];
      if (Math.abs(cur.end_hour - nxt.start_hour) < 0.01) {
        const rowA = STATUS_ROW[cur.status as DutyStatus];
        const rowB = STATUS_ROW[nxt.status as DutyStatus];
        if (rowA !== rowB) {
          const x = GRID_X + cur.end_hour * HR_W;
          const y1 = GRID_Y + rowA * ROW_H + ROW_H / 2;
          const y2 = GRID_Y + rowB * ROW_H + ROW_H / 2;
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#000';
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.stroke();
        }
      }
    }

    // ── OUTER GRID BORDER ──────────────────────────────────────────────
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(LABEL_X, GRID_Y, LABEL_W + GRID_W + GRID_RIGHT_MARGIN, GRID_H);

    // ── REMARKS SECTION ────────────────────────────────────────────────
    ctx.textBaseline = 'top';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillText('Remarks', 8, REMARKS_Y);

    // Remarks lines box
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0, REMARKS_Y + 12, W, 40);

    ctx.font = '8.5px Arial, sans-serif';
    const remarkLines: string[] = [];
    for (const entry of log.timeline_entries) {
      if (entry.notes) {
        const hh = Math.floor(entry.start_hour);
        const mm = Math.round((entry.start_hour % 1) * 60);
        remarkLines.push(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} — ${entry.notes}${entry.location ? ` at ${entry.location}` : ''}`);
      }
    }
    if (remarkLines.length === 0) {
      remarkLines.push(`Driving from ${log.starting_location} to ${log.ending_location}`);
    }
    remarkLines.slice(0, 3).forEach((r, i) => {
      ctx.fillText(r, 6, REMARKS_Y + 15 + i * 13);
    });

    // "Enter name of place..." instruction
    ctx.font = 'italic 8px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Enter name of place you reported and where released from work and when and where each change of duty occurred.', W / 2, REMARKS_Y + 56);
    ctx.fillText('Use time standard of home terminal.', W / 2, REMARKS_Y + 66);
    ctx.textAlign = 'left';

    // ── RECAP SECTION ──────────────────────────────────────────────────
    const recapY = REMARKS_Y + 80;
    ctx.font = 'bold 8.5px Arial, sans-serif';
    ctx.fillText('Recap:', 4, recapY);
    ctx.font = '7.5px Arial, sans-serif';
    ctx.fillText('Complete at', 4, recapY + 10);
    ctx.fillText('end of day', 4, recapY + 19);

    // 70-hour box
    const box70X = 60;
    ctx.strokeRect(box70X, recapY, 200, 72);
    ctx.font = 'bold 8px Arial, sans-serif';
    ctx.fillText('70 Hour/', box70X + 4, recapY + 2);
    ctx.fillText('8 Day', box70X + 4, recapY + 11);
    ctx.fillText('Drivers', box70X + 4, recapY + 20);

    // columns A, B, C inside 70hr box
    const colW70 = 52;
    ['A.', 'B.', 'C.'].forEach((lbl, i) => {
      const cx = box70X + 56 + i * colW70;
      ctx.beginPath(); ctx.moveTo(cx, recapY); ctx.lineTo(cx, recapY + 72); ctx.stroke();
      ctx.font = 'bold 8px Arial, sans-serif';
      ctx.fillText(lbl, cx + 4, recapY + 2);
    });

    const recapRows = [
      'A. Total hours on duty today.',
      'B. Total hours on duty available tomorrow (70 hr. minus A).',
      'C. Total hours on duty last 7 days including today.',
    ];
    ctx.font = '7px Arial, sans-serif';
    const totalOnDuty = log.driving_hours + log.on_duty_not_driving_hours;
    const recapVals70 = [
      totalOnDuty.toFixed(2),
      Math.max(0, 70 - totalOnDuty).toFixed(2),
      '—',
    ];
    recapRows.forEach((_, i) => {
      const cx = box70X + 56 + i * colW70;
      ctx.fillText(recapVals70[i], cx + 4, recapY + 50);
    });

    ctx.font = '7px Arial, sans-serif';
    ctx.fillText('On duty\nhours on\ntoday.\nTotal lines\n3 & 4'.replace(/\n/g, ' | '), box70X + 4, recapY + 35);

    // Asterisk note
    ctx.font = 'italic 7px Arial, sans-serif';
    ctx.fillText('*If you took 34 consecutive hours off duty you have 60/70 hours available', W - 200, recapY + 2);

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
    <div className="bg-white rounded border border-gray-300 overflow-hidden shadow">
      <canvas ref={canvasRef} style={{ width: W, height: H, display: 'block' }} />
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Day {log.day_index + 1} &nbsp;•&nbsp; {log.log_date} &nbsp;•&nbsp; {Math.round(log.miles_today)} miles
        </span>
        <button
          onClick={handleDownload}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
