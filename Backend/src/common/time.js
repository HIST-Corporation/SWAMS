// @ts-check
/**
 * Nepal timezone (Asia/Kathmandu, UTC+5:45) date/time helpers.
 * One source of truth for "today" on the server — the client never decides
 * the organizational day (contract §24).
 */
import { NEPAL_TZ_OFFSET_MINUTES } from './http.js';

/** Milliseconds shift for NPT. */
const SHIFT = NEPAL_TZ_OFFSET_MINUTES * 60_000;

/** Current Nepal date as YYYY-MM-DD. @param {Date} [now] */
export function nepalToday(now = new Date()) {
  return new Date(now.getTime() + SHIFT).toISOString().slice(0, 10);
}

/** Wall-clock HH:MM (NPT) of an instant. @param {Date | string | null | undefined} at */
export function nepalTime(at) {
  if (!at) return null;
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + SHIFT).toISOString().slice(11, 16);
}

/** Wall-clock HH:MM:SS (NPT). @param {Date | string} at */
export function nepalTimeSeconds(at) {
  const date = at instanceof Date ? at : new Date(at);
  return new Date(date.getTime() + SHIFT).toISOString().slice(11, 19);
}

/** ISO instant for a Nepal YYYY-MM-DD at NPT wall-clock HH:MM. @param {string} dateStr @param {string} hhmm */
export function nepalDateTime(dateStr, hhmm = '00:00') {
  return new Date(`${dateStr}T${hhmm}:00+05:45`);
}

/** Minutes between two instants. @param {Date | null} start @param {Date | null} end */
export function minutesBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/** Nepal date N days before/after today. @param {number} offset @param {Date} [now] */
export function nepalDaysAgo(offset, now = new Date()) {
  return new Date(now.getTime() - offset * 86_400_000 + SHIFT).toISOString().slice(0, 10);
}

/** Weekday index (0=Sunday) of a YYYY-MM-DD string, pinned to UTC noon. @param {string} iso */
export function weekdayOf(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** Days in a Gregorian month (month 1–12). @param {number} year @param {number} month */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
