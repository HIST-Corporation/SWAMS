import { nepalParts } from '@swams/i18n';

/**
 * Week-to-date arithmetic for the attendance feature (§9.9). Weeks start
 * **Sunday in Asia/Kathmandu** — Nepal's standard week — computed from Nepal
 * wall-clock parts, never the browser's timezone (§24). The Home feature keeps
 * its own copy with the delta helpers it needs; this one is the smaller,
 * attendance-only form: how many minutes, over how many days, and how far into
 * the week we are.
 *
 * Dates are compared as `YYYY-MM-DD` strings, so the comparison is exact.
 * A week with no recorded days reports `days: 0` and the caller shows the
 * designed empty copy instead of a zero a person might read as "worked
 * nothing". The functions are pure and DOM-free, so they can be unit-tested.
 */

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
 * Week-to-date totals over `GET /attendance/history` rows.
 *
 * `elapsed` is how far into the week we are (1 on a Sunday, 7 once Saturday
 * has run its course). A caller comparing this week against last week needs
 * it: without it, day one reads as a collapse against a finished week — a
 * claim the server never made.
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
 * only data the week strip is allowed to draw (§9.6: no fake charts).
 *
 * A day with no recorded minutes comes back as `minutes: 0` rather than being
 * dropped, so the strip shows a real gap instead of inventing a number the
 * server never stated.
 *
 * @param {Array<{date: string, workedMinutes: number}>} rows
 * @param {Date} [now]
 * @returns {Array<{date: string, dayIndex: number, minutes: number, hours: number, workedMinutes: number}>}
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
    series.push({
      date,
      dayIndex: day.getUTCDay(),
      minutes,
      hours: minutes / 60,
      workedMinutes: minutes,
    });
  }
  return series;
}
