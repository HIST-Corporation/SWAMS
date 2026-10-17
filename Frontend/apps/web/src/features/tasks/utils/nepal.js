import { nepalParts } from '@swams/i18n';

/**
 * Nepal-calendar dates for the tasks feature (§24: the "today" a task is due on
 * is the organisation's day in Asia/Kathmandu, never the browser's).
 *
 * The BS converter is still an open contract request (request 1), so these
 * helpers speak Gregorian `YYYY-MM-DD` only — the shape the API stores.
 */

/** Nepal calendar day as `YYYY-MM-DD`. */
export function nepalIso(now = new Date()) {
  const p = nepalParts(now);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` for `days` days from the Nepal calendar day (negative = past). */
export function nepalIsoDaysAgo(days) {
  return nepalIso(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}
