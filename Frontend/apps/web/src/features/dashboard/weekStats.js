import { nepalParts } from '@swams/i18n';

/**
 * How many days of `GET /attendance/history` the Home screen asks for: the
 * current week plus the one before it, so the "This week" panel can state a
 * real week-over-week delta. Every Home widget asks for the same window, which
 * keeps the queries on one cache entry instead of three.
 */
export const HISTORY_WINDOW = 14;

const DAY_MS = 86_400_000;

/** Today's Nepal calendar date as `YYYY-MM-DD`, from wall-clock parts. */
function todayIso(now) {
  const { year, month, day } = nepalParts(now);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** The Sunday that starts the current Nepal week, as `YYYY-MM-DD`. */
function weekStartIso(now) {
  const today = new Date(`${todayIso(now)}T00:00:00.000Z`);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - today.getUTCDay()); // 0 = Sunday
  return start.toISOString().slice(0, 10);
}

/**
 * Week-to-date totals over `GET /attendance/history` rows (Section 9.9: the
 * tinted "This week" panel). Weeks start **Sunday in Asia/Kathmandu** — Nepal's
 * standard week — computed from Nepal wall-clock parts, never the browser TZ.
 *
 * Dates are `YYYY-MM-DD` strings, so string comparison is exact. History rows
 * outside the current week are ignored; a week with no recorded days reports
 * `days: 0` and the caller shows the designed empty copy instead of a zero
 * the worker might read as "worked nothing".
 *
 * `elapsed` is how far into the week we are (1 on a Sunday, 7 once Saturday
 * has run its course). Callers that compare against the previous week need it,
 * otherwise day one of the week reads as a collapse.
 *
 * @param {Array<{date: string, workedMinutes: number}>} rows
 * @param {Date} [now]
 * @returns {{ minutes: number, days: number, elapsed: number, start: string }}
 */
export function weekStats(rows, now = new Date()) {
  const startIso = weekStartIso(now);
  let minutes = 0;
  let days = 0;
  for (const row of rows ?? []) {
    if (row.date < startIso) continue;
    minutes += row.workedMinutes ?? 0;
    if ((row.workedMinutes ?? 0) > 0) days += 1;
  }
  const elapsed =
    Math.round(
      (Date.parse(`${startIso}T00:00:00.000Z`) - Date.parse(`${todayIso(now)}T00:00:00.000Z`)) /
        -DAY_MS,
    ) + 1;

  return { minutes, days, elapsed: Math.min(7, Math.max(1, elapsed)), start: startIso };
}

/**
 * The current week split into its seven Nepal weekdays, oldest first — the
 * only data the Home chart is allowed to draw (Section 9.6: no fake charts).
 *
 * A day with no recorded minutes comes back as `minutes: 0` rather than being
 * dropped, so the chart shows a real gap instead of interpolating a number the
 * server never stated.
 *
 * @param {Array<{date: string, workedMinutes: number}>} rows
 * @param {Date} [now]
 * @returns {Array<{date: string, dayIndex: number, minutes: number, hours: number}>}
 */
export function weekSeries(rows, now = new Date()) {
  const byDate = new Map();
  for (const row of rows ?? []) byDate.set(row.date, row.workedMinutes ?? 0);

  const start = new Date(`${weekStartIso(now)}T00:00:00.000Z`);
  const series = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const date = day.toISOString().slice(0, 10);
    const minutes = byDate.get(date) ?? 0;
    series.push({ date, dayIndex: day.getUTCDay(), minutes, hours: minutes / 60 });
  }
  return series;
}

/**
 * Total minutes in the week *before* the current one, for the delta chip.
 *
 * Returns `null` when the payload does not reach back far enough to cover the
 * whole previous week — the caller then drops the chip rather than printing a
 * comparison against missing data (Section 7.6: never imply what the server
 * did not say).
 *
 * Pass `throughDays` to compare like with like: the previous week truncated to
 * the same number of days the current one has run. Without it a Monday reads
 * as a 50-hour collapse against someone else's finished week — a claim the
 * server never made.
 *
 * @param {Array<{date: string, workedMinutes: number}>} rows
 * @param {Date} [now]
 * @param {number|null} [throughDays] 1–7; `null` means the whole previous week
 * @returns {number|null}
 */
export function lastWeekMinutes(rows, now = new Date(), throughDays = null) {
  const list = rows ?? [];
  const startIso = weekStartIso(now);
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const prevStart = new Date(start);
  prevStart.setUTCDate(start.getUTCDate() - 7);
  const fromIso = prevStart.toISOString().slice(0, 10);

  const oldest = list.reduce((min, row) => (row.date < min ? row.date : min), startIso);
  if (oldest > fromIso) return null;

  const span = throughDays === null ? 7 : Math.min(7, Math.max(1, throughDays));
  const wanted = new Set();
  for (let i = 0; i < span; i += 1) {
    const day = new Date(prevStart);
    day.setUTCDate(prevStart.getUTCDate() + i);
    wanted.add(day.toISOString().slice(0, 10));
  }

  let minutes = 0;
  for (const row of list) {
    if (wanted.has(row.date)) minutes += row.workedMinutes ?? 0;
  }
  return minutes;
}
