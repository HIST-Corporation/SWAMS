/**
 * Date-range helpers for the reports feature (DOM-free, unit-tested).
 * Dates arrive as `YYYY-MM-DD` strings and are parsed as UTC noon so a
 * calendar day never shifts across the Nepal offset (§24); "today" is the
 * Nepal wall-clock day, not the browser's.
 */
import { nepalParts } from '@swams/i18n';

/** @param {string} iso `YYYY-MM-DD` */
export function isIsoDate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(`${iso}T12:00:00Z`));
}

/** @param {string} iso @returns {Date | null} */
export function parseIsoNoon(iso) {
  if (!isIsoDate(iso)) return null;
  return new Date(`${iso}T12:00:00Z`);
}

/**
 * Inclusive count of Monday–Friday days between two ISO dates.
 * @param {string} from @param {string} to
 * @returns {number} 0 when the range is invalid
 */
export function businessDays(from, to) {
  const start = parseIsoNoon(from);
  const end = parseIsoNoon(to);
  if (!start || !end || start > end) return 0;
  let count = 0;
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

/** @param {{year: number, month: number, day: number}} parts */
function isoFromNepalParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/** Default window: the last 30 Nepal-calendar days, in `YYYY-MM-DD`. */
export function defaultRange(now = new Date()) {
  return {
    from: isoFromNepalParts(nepalParts(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))),
    to: isoFromNepalParts(nepalParts(now)),
  };
}
