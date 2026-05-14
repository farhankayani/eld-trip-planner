import { useEffect, useRef } from 'react';
import type { DailyLog, DutyStatus } from '../../types/trip';

interface Props {
  log: DailyLog;
}

// ── Logical canvas dimensions (what we draw into) ──────────────────────────
const W = 1100;
const H = 710;

// ── Header / info area ─────────────────────────────────────────────────────
const INFO_H = 134;  // extra row for Shipper / Commodity / Load No.

// ── Grid layout ───────────────────────────────────────────────────────────
const LABEL_W = 160;          // left label column width
const TOTAL_W = 60;           // right "Total Hours" column width
const GRID_X = LABEL_W;
const GRID_W = W - LABEL_W - TOTAL_W;
const GRID_Y = INFO_H + 42;  // leave room for hour labels above
const ROW_H = 44;
const GRID_H = ROW_H * 4;
const HR_W = GRID_W / 24;

// ── Sections below grid ────────────────────────────────────────────────────
const REMARKS_Y = GRID_Y + GRID_H + 16;

// ── Status → row index ────────────────────────────────────────────────────
const STATUS_ROW: Record<DutyStatus, number> = {
  OFF: 0,
  SLEEPER: 1,
  DRIVING: 2,
  ON_DUTY: 3,
};

const ROW_LABELS = [
  ['1. Off Duty'],
  ['2. Sleeper', '   Berth'],
  ['3. Driving'],
  ['4. On Duty', '   (Not Driving)'],
];

// ── Draw the full ELD form onto `ctx` ─────────────────────────────────────
function drawELD(ctx: CanvasRenderingContext2D, log: DailyLog) {
  // Background
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // ── TITLE / DATE ROW ──────────────────────────────────────────────────
  ctx.fillStyle = '#000';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText("Driver's Daily Log", 8, 6);

  ctx.font = '9px Arial, sans-serif';
  ctx.fillText('(24 hours)', 8, 23);

  const dateObj = new Date(log.log_date + 'T12:00:00');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day   = String(dateObj.getDate()).padStart(2, '0');
  const year  = String(dateObj.getFullYear());

  ctx.font = '11px Arial, sans-serif';
  ctx.fillText(`${month}  /  ${day}  /  ${year}`, 230, 6);
  ctx.font = '8px Arial, sans-serif';
  ctx.fillText('(month)', 228, 20);
  ctx.fillText('(day)', 263, 20);
  ctx.fillText('(year)', 296, 20);

  ctx.font = '8px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Original – File at home terminal.', W - 4, 6);
  ctx.fillText('Duplicate – Driver retains in his/her possession for 8 days.', W - 4, 17);
  ctx.textAlign = 'left';

  hLine(ctx, 0, W, 32, 1);

  // ── FROM / TO ─────────────────────────────────────────────────────────
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillText('From:', 8, 36);
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText(log.starting_location || '', 44, 36);

  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillText('To:', W / 2 + 4, 36);
  ctx.font = '10px Arial, sans-serif';
  ctx.fillText(log.ending_location || '', W / 2 + 22, 36);

  hLine(ctx, 0, W, 50, 0.8);

  // ── INFO BOXES ROW 1 ─────────────────────────────────────────────────
  const bY1 = 52, bH = 24;
  rect(ctx, 6,   bY1, 110, bH);
  rect(ctx, 122, bY1, 110, bH);
  rect(ctx, 238, bY1, W - 244, bH);

  ctx.font = '7.5px Arial, sans-serif';
  ctx.fillText('Total Miles Driving Today',     8,   bY1 + 2);
  ctx.fillText('Total Mileage Today',           124, bY1 + 2);
  ctx.fillText('Name of Carrier or Carriers',   240, bY1 + 2);

  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(String(Math.round(log.miles_today)), 45, bY1 + 12);

  hLine(ctx, 0, W, bY1 + bH + 2, 0.6);

  // ── INFO BOXES ROW 2 ─────────────────────────────────────────────────
  const bY2 = bY1 + bH + 4;
  rect(ctx, 6,   bY2, 220, bH);
  rect(ctx, 232, bY2, 200, bH);
  rect(ctx, 438, bY2, W - 444, bH);

  ctx.font = '7.5px Arial, sans-serif';
  ctx.fillText('Truck/Tractor and Trailer Numbers or License Plate(s)/State', 8,   bY2 + 2);
  ctx.fillText('Main Office Address',   234, bY2 + 2);
  ctx.fillText('Home Terminal Address', 440, bY2 + 2);

  hLine(ctx, 0, W, bY2 + bH + 2, 0.6);

  // ── INFO BOXES ROW 3: Shipper / Commodity / Load No. ─────────────────
  const bY3 = bY2 + bH + 4;
  const loadW = 120;
  const shipW = (W - loadW - 18) / 2;
  rect(ctx, 6,              bY3, shipW,  bH);
  rect(ctx, 12 + shipW,     bY3, shipW,  bH);
  rect(ctx, 18 + shipW * 2, bY3, loadW,  bH);

  ctx.font = '7.5px Arial, sans-serif';
  ctx.fillText('Shipper and Address',           8,              bY3 + 2);
  ctx.fillText('Commodity',                     14 + shipW,     bY3 + 2);
  ctx.fillText('Load No.',                      20 + shipW * 2, bY3 + 2);

  ctx.font = '10px Arial, sans-serif';
  ctx.fillText(log.shipper   || '', 8,              bY3 + 13);
  ctx.fillText(log.commodity || '', 14 + shipW,     bY3 + 13);
  ctx.fillText(log.load_no   || '', 20 + shipW * 2, bY3 + 13);

  hLine(ctx, 0, W, bY3 + bH + 2, 0.6);

  // ── HOUR LABELS ABOVE GRID ────────────────────────────────────────────
  const lblY = GRID_Y - 24;

  ctx.font = 'bold 7.5px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mid-',  GRID_X,              lblY - 8);
  ctx.fillText('night', GRID_X,              lblY);
  ctx.fillText('Noon',  GRID_X + 12 * HR_W, lblY - 4);
  ctx.fillText('Mid-',  GRID_X + 24 * HR_W, lblY - 8);
  ctx.fillText('night', GRID_X + 24 * HR_W, lblY);

  // AM hours 1-11
  ctx.font = '9px Arial, sans-serif';
  for (let h = 1; h <= 11; h++) {
    ctx.fillText(String(h), GRID_X + h * HR_W, lblY);
  }
  // PM hours 1-11
  for (let h = 1; h <= 11; h++) {
    ctx.fillText(String(h), GRID_X + (12 + h) * HR_W, lblY);
  }

  // "Total Hours" header
  ctx.font = 'bold 8px Arial, sans-serif';
  ctx.fillText('Total',  GRID_X + GRID_W + TOTAL_W / 2, GRID_Y - 18);
  ctx.fillText('Hours',  GRID_X + GRID_W + TOTAL_W / 2, GRID_Y - 8);
  ctx.textAlign = 'left';

  // ── GRID BACKGROUND ───────────────────────────────────────────────────
  ctx.fillStyle = '#fff';
  ctx.fillRect(GRID_X, GRID_Y, GRID_W, GRID_H);

  // Shade alternate half-hour columns lightly for readability
  ctx.fillStyle = '#f8f8f8';
  for (let h = 0; h < 24; h++) {
    if (h % 2 === 1) {
      ctx.fillRect(GRID_X + h * HR_W, GRID_Y, HR_W, GRID_H);
    }
  }

  // ── VERTICAL HOUR LINES ───────────────────────────────────────────────
  for (let h = 0; h <= 24; h++) {
    const x = GRID_X + h * HR_W;
    const isMajor = h % 6 === 0;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = isMajor ? 1.5 : 0.6;
    vLine(ctx, x, GRID_Y, GRID_Y + GRID_H);

    // Quarter-hour tick marks inside each row
    if (h < 24) {
      for (let q = 1; q <= 3; q++) {
        const qx = x + (q / 4) * HR_W;
        const tickH = q === 2 ? 12 : 7;
        ctx.lineWidth = 0.4;
        ctx.strokeStyle = '#888';
        for (let row = 0; row < 4; row++) {
          const ry = GRID_Y + row * ROW_H;
          // top tick
          ctx.beginPath(); ctx.moveTo(qx, ry); ctx.lineTo(qx, ry + tickH); ctx.stroke();
          // bottom tick
          ctx.beginPath(); ctx.moveTo(qx, ry + ROW_H); ctx.lineTo(qx, ry + ROW_H - tickH); ctx.stroke();
        }
      }
    }
  }

  // ── HORIZONTAL ROW DIVIDERS ───────────────────────────────────────────
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.8;
  for (let row = 0; row <= 4; row++) {
    const y = GRID_Y + row * ROW_H;
    hLine(ctx, GRID_X, GRID_X + GRID_W, y, row === 0 || row === 4 ? 1.2 : 0.8);
  }

  // ── STATUS BARS ───────────────────────────────────────────────────────
  // Draw filled black band at vertical center of each status row,
  // matching the real paper ELD form style.
  const BAR_H = 6; // thickness of the status band

  const sorted = [...log.timeline_entries].sort((a, b) => a.start_hour - b.start_hour);

  for (const entry of sorted) {
    const row = STATUS_ROW[entry.status as DutyStatus];
    const x1  = GRID_X + entry.start_hour * HR_W;
    const x2  = GRID_X + entry.end_hour   * HR_W;
    const midY = GRID_Y + row * ROW_H + ROW_H / 2;

    // Filled status bar
    ctx.fillStyle = '#000';
    ctx.fillRect(x1, midY - BAR_H / 2, x2 - x1, BAR_H);

    // Left vertical edge (full row height)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    vLine(ctx, x1, GRID_Y + row * ROW_H, GRID_Y + (row + 1) * ROW_H);

    // Right vertical edge (full row height)
    vLine(ctx, x2, GRID_Y + row * ROW_H, GRID_Y + (row + 1) * ROW_H);
  }

  // Vertical transition connectors between consecutive entries
  for (let i = 0; i + 1 < sorted.length; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    if (Math.abs(cur.end_hour - nxt.start_hour) < 0.02) {
      const rowA = STATUS_ROW[cur.status as DutyStatus];
      const rowB = STATUS_ROW[nxt.status as DutyStatus];
      if (rowA !== rowB) {
        const x  = GRID_X + cur.end_hour * HR_W;
        const y1 = GRID_Y + rowA * ROW_H + ROW_H / 2;
        const y2 = GRID_Y + rowB * ROW_H + ROW_H / 2;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      }
    }
  }

  // ── ROW LABELS (left column) ──────────────────────────────────────────
  rect(ctx, 0, GRID_Y, LABEL_W, GRID_H, 1.2);

  ctx.fillStyle = '#000';
  ctx.textBaseline = 'middle';
  ctx.font = '9.5px Arial, sans-serif';
  for (let row = 0; row < 4; row++) {
    const cy = GRID_Y + row * ROW_H + ROW_H / 2;
    const lines = ROW_LABELS[row];
    if (lines.length === 1) {
      ctx.fillText(lines[0], 6, cy);
    } else {
      ctx.fillText(lines[0], 6, cy - 7);
      ctx.fillText(lines[1], 6, cy + 7);
    }
    if (row > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.8;
      hLine(ctx, 0, LABEL_W, GRID_Y + row * ROW_H, 0.8);
    }
  }

  // ── TOTAL HOURS COLUMN (right) ─────────────────────────────────────────
  const totX = GRID_X + GRID_W;
  rect(ctx, totX, GRID_Y, TOTAL_W, GRID_H, 1.2);
  for (let row = 1; row < 4; row++) {
    hLine(ctx, totX, totX + TOTAL_W, GRID_Y + row * ROW_H, 0.8);
  }

  const totals = [
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
      totals[row].toFixed(2),
      totX + TOTAL_W / 2,
      GRID_Y + row * ROW_H + ROW_H / 2,
    );
  }
  ctx.textAlign = 'left';

  // ── OUTER GRID BORDER ─────────────────────────────────────────────────
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, GRID_Y, LABEL_W + GRID_W + TOTAL_W, GRID_H);

  // ── REMARKS SECTION ───────────────────────────────────────────────────
  ctx.textBaseline = 'top';
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillText('Remarks', 8, REMARKS_Y);

  rect(ctx, 0, REMARKS_Y + 14, W, 44, 0.8);

  const remarkLines: string[] = [];
  for (const entry of sorted) {
    if (entry.notes) {
      const hh = Math.floor(entry.start_hour);
      const mm = Math.round((entry.start_hour % 1) * 60);
      remarkLines.push(
        `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} — ${entry.notes}` +
        (entry.location ? ` at ${entry.location}` : ''),
      );
    }
  }
  if (remarkLines.length === 0) {
    remarkLines.push(`Driving from ${log.starting_location} to ${log.ending_location}`);
  }
  ctx.font = '8.5px Arial, sans-serif';
  remarkLines.slice(0, 3).forEach((r, i) => {
    ctx.fillText(r, 6, REMARKS_Y + 17 + i * 14);
  });

  ctx.font = 'italic 7.5px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Enter name of place you reported and where released from work and when and where each change of duty occurred.',
    W / 2, REMARKS_Y + 62,
  );
  ctx.fillText('Use time standard of home terminal.', W / 2, REMARKS_Y + 73);
  ctx.textAlign = 'left';

  // ── RECAP SECTION ─────────────────────────────────────────────────────
  //
  // Layout (matches paper ELD form):
  //
  //  "Recap:"       ┌─────────────────┬──────────┬──────────┬──────────┐
  //  "Complete at"  │ 70 Hour /       │    A.    │    B.    │    C.    │  ← col-letter row (16px)
  //  "end of day"   │ 8 Day Drivers   ├──────────┼──────────┼──────────┤
  //                 │                 │ desc...  │ desc...  │ desc...  │  ← description row (34px)
  //                 │                 ├──────────┼──────────┼──────────┤
  //                 │                 │  value   │  value   │  value   │  ← value row (22px)
  //                 └─────────────────┴──────────┴──────────┴──────────┘
  //
  //  titleColW = 110px   dataColW = 80px × 3   total = 350px

  const recapY    = REMARKS_Y + 90;
  const titleColW = 110;   // left column: "70 Hour / 8 Day Drivers"
  const dataColW  = 80;    // each A / B / C column
  const r_bW      = titleColW + dataColW * 3;
  const letterH   = 16;    // row for A. B. C. letters
  const r_descH   = 36;    // description text row
  const r_valH    = 24;    // value row
  const r_bH      = letterH + r_descH + r_valH;
  const r_bx      = 72;    // box left edge (after "Recap:" label)

  // "Recap:" side label
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = 'bold 9px Arial, sans-serif';
  ctx.fillText('Recap:', 4, recapY);
  ctx.font = '7px Arial, sans-serif';
  ctx.fillText('Complete at', 4, recapY + 13);
  ctx.fillText('end of day', 4, recapY + 22);

  // Outer box
  rect(ctx, r_bx, recapY, r_bW, r_bH, 1);

  // Title column: left vertical separator
  vLine(ctx, r_bx + titleColW, recapY, recapY + r_bH, 0.8);

  // Title text ("70 Hour / 8 Day Drivers") stacked in left column
  ctx.font = 'bold 8px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('70 Hour /',    r_bx + 4, recapY + 4);
  ctx.fillText('8 Day',        r_bx + 4, recapY + 14);
  ctx.fillText('Drivers',      r_bx + 4, recapY + 24);

  // Horizontal line under letter row (only across data columns)
  hLine(ctx, r_bx + titleColW, r_bx + r_bW, recapY + letterH, 0.8);
  // Horizontal line under description row
  hLine(ctx, r_bx + titleColW, r_bx + r_bW, recapY + letterH + r_descH, 0.8);

  const totalOnDuty = log.driving_hours + log.on_duty_not_driving_hours;
  const recapCols = [
    {
      lbl: 'A.',
      desc: ['Total hours on duty', 'today (lines 3 & 4).'],
      val: totalOnDuty.toFixed(2),
    },
    {
      lbl: 'B.',
      desc: ['Hours available', 'tomorrow (70 hr – A).'],
      val: Math.max(0, 70 - totalOnDuty).toFixed(2),
    },
    {
      lbl: 'C.',
      desc: ['Total hrs on duty', 'last 7 days incl. today.'],
      val: '—',
    },
  ];

  recapCols.forEach((col, i) => {
    const cx = r_bx + titleColW + i * dataColW;

    // Vertical separator between data columns
    if (i > 0) vLine(ctx, cx, recapY, recapY + r_bH, 0.8);

    // Column letter — centred in letter row
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(col.lbl, cx + dataColW / 2, recapY + letterH / 2);

    // Description lines
    ctx.font = '7px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    col.desc.forEach((line, li) => {
      ctx.fillText(line, cx + 4, recapY + letterH + 3 + li * 12);
    });

    // Value — bold, centred in value row
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(col.val, cx + dataColW / 2, recapY + letterH + r_descH + r_valH / 2);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Asterisk note to the right of the recap box
  ctx.font = 'italic 7px Arial, sans-serif';
  ctx.fillText(
    '*If you took 34 consecutive hours off duty you have 60/70 hours available.',
    r_bx + r_bW + 12, recapY + 4,
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function hLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, lw = 1) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
}

function vLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, lw = 1) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lw = 1) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

// ── Component ─────────────────────────────────────────────────────────────
export function ELDCanvas({ log }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    // Keep logical CSS size fixed — download is always full resolution
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    drawELD(ctx, log);
  }, [log]);

  // Scale the canvas to fit the container width whenever the container resizes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas  = canvasRef.current;
    if (!wrapper || !canvas) return;

    const applyScale = () => {
      const available = wrapper.clientWidth;
      const scale = Math.min(1, available / W);
      canvas.style.transform      = `scale(${scale})`;
      canvas.style.transformOrigin = 'top left';
      wrapper.style.height         = `${H * scale}px`;
    };

    applyScale();
    const ro = new ResizeObserver(applyScale);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `eld-log-day-${log.day_index + 1}-${log.log_date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-white rounded border border-gray-300 shadow overflow-hidden">
      {/* Preview wrapper: canvas is scaled to fit, no clipping */}
      <div ref={wrapperRef} style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: W, height: H }}
        />
      </div>

      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Day {log.day_index + 1}&nbsp;•&nbsp;{log.log_date}&nbsp;•&nbsp;{Math.round(log.miles_today)} miles
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
