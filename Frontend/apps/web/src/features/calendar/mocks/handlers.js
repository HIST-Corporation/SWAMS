import { http, HttpResponse } from 'msw';
import { isAuthorized } from '../../auth/mocks/authState.js';
import { monthBounds, nepalToday } from '../utils/month.js';
import { deriveCalendar } from './fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const MAX_RANGE_DAYS = 92;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

function isIso(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/** ISO bounds of the current Nepal month, matching the client's defaults. */
function defaultMonth() {
  const now = nepalToday();
  return monthBounds(now.year, now.month);
}

/**
 * Calendar mock handler (contract request 23). MOCK ONLY — there is no
 * backend calendar endpoint yet; the shape here is what the UI asked for and
 * is asserted in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - requires the bearer token the auth mock issued (401 else)
 *  - `from`/`to` are optional `YYYY-MM-DD` (default: the current Nepal month);
 *    malformed dates → 422 `invalid_date`, `from > to` → 422 `invalid_range`
 *  - ranges longer than 92 days → 422 `range_too_long` (a month-grid endpoint
 *    must never dump a whole year)
 *  - only days with events appear; dates sort ascending
 */
export const calendarHandlers = [
  http.get(`${API}/calendar`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const params = new URL(request.url).searchParams;
    const fallback = defaultMonth();
    const from = params.get('from') || fallback.from;
    const to = params.get('to') || fallback.to;
    if (!isIso(from) || !isIso(to)) {
      return error(422, 'invalid_date', 'Dates must be YYYY-MM-DD.');
    }
    if (from > to) {
      return error(422, 'invalid_range', 'The start date must be on or before the end date.');
    }
    const span = Math.round(
      (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000 + 1,
    );
    if (span > MAX_RANGE_DAYS) {
      return error(422, 'range_too_long', 'Ask for at most 92 days at a time.');
    }
    return HttpResponse.json(deriveCalendar(from, to));
  }),
];
