import { attendanceHistory, mockTodayIso } from './fixtures.js';

/**
 * Month calendar fixtures (MOCK ONLY). One deterministic day-status row per
 * calendar day so `/attendance` can draw a whole month without inventing a
 * second source of truth: the last 14 days are read straight from
 * `attendanceHistory()` — the same rows the history list and week strip serve,
 * so the calendar can never disagree with them (§7.6). Older days of the month
 * fall back to a fixed pattern keyed on the date (never random), and future
 * days carry no status at all: a day that has not happened has no record.
 */

const pad = (value) => String(value).padStart(2, '0');

/** Filler statuses for days older than the 14-day history window. */
const FILLER = [
  'present',
  'present',
  'late',
  'present',
  'absent',
  'present',
  'half_day',
  'present',
  'holiday',
  'present',
  'leave',
  'present',
  'present',
  'late',
];

/** Worked minutes a status implies in the filler (the pattern is fixed). */
const MINUTES = {
  present: 480,
  late: 420,
  half_day: 240,
  absent: 0,
  leave: 0,
  holiday: 0,
};

/** Days in a Gregorian month (month: 1–12). */
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Weekday index (0 = Sunday) of a `YYYY-MM-DD` string, pinned to UTC noon. */
function weekdayOf(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/**
 * Every day of `month` (`YYYY-MM`) with its status — `null` for days still to
 * come. Saturdays are the Nepali weekly off; days inside the history window
 * carry that window's exact row.
 * @param {string} month `YYYY-MM`
 * @returns {{month: string, days: Array<{date: string, status: string|null, workedMinutes?: number, clockIn?: string|null, clockOut?: string|null}>}}
 */
export function attendanceMonth(month) {
  const [year, monthNum] = month.split('-').map(Number);
  const today = mockTodayIso();
  const known = new Map(attendanceHistory().map((row) => [row.date, row]));
  const total = daysInMonth(year, monthNum);
  const days = [];

  for (let day = 1; day <= total; day += 1) {
    const date = `${year}-${pad(monthNum)}-${pad(day)}`;
    if (date > today) {
      days.push({ date, status: null });
      continue;
    }
    const historyRow = known.get(date);
    if (historyRow) {
      days.push({
        date,
        status: historyRow.status,
        workedMinutes: historyRow.workedMinutes,
        clockIn: historyRow.clockIn,
        clockOut: historyRow.clockOut,
      });
      continue;
    }
    const status =
      weekdayOf(date) === 6 ? 'holiday' : FILLER[(year + monthNum * 31 + day) % FILLER.length];
    days.push({ date, status, workedMinutes: MINUTES[status] ?? 0, clockIn: null, clockOut: null });
  }

  return { month, days };
}

/** `YYYY-MM` for a `YYYY-MM-DD` date, or `null` when malformed. */
export function monthOf(dateIso) {
  return /^\d{4}-\d{2}$/.test(dateIso ?? '') ? dateIso : null;
}
