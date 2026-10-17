import { nepalParts } from '@swams/i18n';

/**
 * Month-grid helpers for the calendar feature (DOM-free, unit-tested).
 * The month a person browses is the month as seen in Asia/Kathmandu (§24) —
 * derived from `nepalParts`, never from the browser's timezone. Dates are AD
 * (`YYYY-MM-DD`); BS waits on the verified converter.
 */

/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0');

/** Today's Nepal calendar date, in Gregorian numbering. */
export function nepalToday(now = new Date()) {
  const { year, month, day } = nepalParts(now);
  return { year, month, day, iso: `${year}-${pad(month)}-${pad(day)}` };
}

/** First and last `YYYY-MM-DD` of a Gregorian month (month: 1–12). */
export function monthBounds(year, month) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(last)}`,
    daysInMonth: last,
  };
}

/** @param {{year: number, month: number}} cursor */
export function prevMonth({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** @param {{year: number, month: number}} cursor */
export function nextMonth({ year, month }) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** `YYYY-MM-DD` for one day of a month. */
export function isoDay(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Weekday index (0 = Sunday) of an ISO date, computed from UTC noon.
 * The grid starts the week on Sunday, which is how Nepali offices read a
 * month; Saturday (index 6) is the weekly off.
 */
export function weekdayIndex(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Saturday: the weekly off in the Nepali working week (§24). */
export const WEEKLY_OFF_INDEX = 6;

/** True for a `YYYY-MM-DD` string that parses as a real calendar date. */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/**
 * Move an ISO date by whole days (negative goes back). Anchored at UTC noon so
 * a daylight-saving shift in the visitor's own timezone can never land on the
 * wrong day — the calendar is the org's calendar (§24).
 * @param {string} iso
 * @param {number} delta
 */
export function addDays(iso, delta) {
  const shifted = new Date(Date.parse(`${iso}T12:00:00Z`) + delta * 86_400_000);
  return isoDay(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/**
 * The same day-of-month in a month `delta` months away, clamped to the shorter
 * month — 31 Jan + 1 month is 28 Feb, never a 31st that does not exist.
 * @param {string} iso
 * @param {number} delta
 */
export function stepMonthIso(iso, delta) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const shifted = month + delta - 1;
  const targetYear = year + Math.floor(shifted / 12);
  const targetMonth = (((shifted % 12) + 12) % 12) + 1;
  const { daysInMonth } = monthBounds(targetYear, targetMonth);
  return isoDay(targetYear, targetMonth, Math.min(day, daysInMonth));
}

/**
 * Keep an ISO date inside a month's bounds — how Home/End stay honest at the
 * edges of a week that starts in the previous month.
 * @param {string} iso
 * @param {{ from: string, to: string }} bounds
 */
export function clampToMonth(iso, bounds) {
  if (iso < bounds.from) return bounds.from;
  if (iso > bounds.to) return bounds.to;
  return iso;
}
