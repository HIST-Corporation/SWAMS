import { nepalParts } from '@swams/i18n';

/**
 * Analytics fixtures (MOCK ONLY) — contract-shaped sample data for the
 * `/analytics` screen until the real analytics endpoint lands (contract
 * request 27). Every figure is deterministic for a period: the series anchors
 * to the Nepal calendar (§24) the way `attendanceHistory` does, so the page
 * never renders a frozen or random chart. The screen labels itself with
 * PreviewNotice — nothing here is presented as production behavior (§12.1).
 */

export const PERIODS = ['week', 'month', 'year'];

const pad = (value) => String(value).padStart(2, '0');

/** Today's Nepal date as `YYYY-MM-DD`, computed from Asia/Kathmandu. */
function nepalTodayIso(now = new Date()) {
  const { year, month, day } = nepalParts(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The last `count` days, oldest first, ending today (Nepal wall-clock). */
function recentDates(count, now = new Date()) {
  const today = new Date(`${nepalTodayIso(now)}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getTime() - (count - 1 - index) * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

/** The last 12 months, oldest first, ending with the current one. */
function recentMonths(count = 12, now = new Date()) {
  const { year, month } = nepalParts(now);
  return Array.from({ length: count }, (_, index) => {
    const shifted = month - 1 - (count - 1 - index);
    const y = year + Math.floor(shifted / 12);
    const m = (((shifted % 12) + 12) % 12) + 1;
    return `${y}-${pad(m)}-01`;
  });
}

/**
 * One bucket of the series. `minutes === null` means the bucket carried no
 * record (a Saturday in the day series) — the chart draws a gap, never a
 * fabricated 0h day (§9.7), and the table prints an em dash.
 * @param {string} date `YYYY-MM-DD` or `YYYY-MM-01`
 * @param {number} index position in the series (drives the fixed pattern)
 */
function bucket(date, index) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const isMonthly = date.endsWith('-01');
  if (!isMonthly && weekday === 6) {
    return { date, rate: null, minutes: null };
  }
  return {
    date,
    rate: 84 + ((index * 7 + Number(date.slice(8, 10)) || index) % 13),
    minutes: isMonthly ? 7_800 + ((index * 367) % 1_700) : 420 + ((index * 23) % 70),
  };
}

/**
 * The whole analytics payload for one period — series, day breakdown and the
 * summary tiles read from ONE derivation so no two panels of the screen can
 * state different numbers (§7.6).
 * @param {'week'|'month'|'year'} period
 * @param {Date} [now]
 */
export function deriveAnalytics(period, now = new Date()) {
  const dates =
    period === 'week'
      ? recentDates(7, now)
      : period === 'month'
        ? recentDates(30, now)
        : recentMonths(12, now);
  const points = dates.map((date, index) => bucket(date, index));

  const recorded = points.filter((point) => point.minutes !== null);
  const hours = recorded.reduce((sum, point) => sum + point.minutes, 0);
  const rate =
    recorded.length === 0
      ? 0
      : Math.round((recorded.reduce((sum, point) => sum + point.rate, 0) / recorded.length) * 10) /
        10;

  // Day-status breakdown over the same window. Saturdays are the Nepali
  // weekly off — they belong to neither bucket — and the present count is
  // derived from what is left, so the bars always sum to the working days
  // the series actually shows (§7.6).
  const weeklyOff = points.filter((point) => point.minutes === null).length;
  const workDays = points.length - weeklyOff;
  const leaveDays = period === 'week' ? 1 : period === 'month' ? 3 : 2;
  const lateDays = period === 'week' ? 1 : period === 'month' ? 3 : 1;
  const absentDays = period === 'week' ? 0 : period === 'month' ? 2 : 1;
  const presentDays = Math.max(0, workDays - leaveDays - lateDays - absentDays);

  return {
    period,
    points,
    summary: {
      rate,
      workedMinutes: hours,
      presentDays,
      lateDays,
    },
    breakdown: { present: presentDays, late: lateDays, absent: absentDays, leave: leaveDays },
  };
}
