import { http, HttpResponse } from 'msw';
import { isAuthorized } from '../../auth/mocks/authState.js';
import { deriveReport, isValidBound, REPORT_COLUMNS, REPORT_TYPES } from './fixtures.js';
import { deriveAnalytics, PERIODS } from './analyticsFixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const DEFAULT_FROM_OFFSET_DAYS = 29;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

function defaultBounds() {
  const to = new Date();
  const from = new Date(to.getTime() - DEFAULT_FROM_OFFSET_DAYS * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Validate the shared query; returns the failure Response or the bounds. */
function readParams(request) {
  const params = new URL(request.url).searchParams;
  const type = params.get('type');
  if (!REPORT_TYPES.includes(type)) {
    return { failure: error(422, 'invalid_type', 'Type must be attendance, leave or tasks.') };
  }
  const fallback = defaultBounds();
  const from = params.get('from') || fallback.from;
  const to = params.get('to') || fallback.to;
  if (!isValidBound(from) || !isValidBound(to)) {
    return { failure: error(422, 'invalid_date', 'Dates must be YYYY-MM-DD.') };
  }
  if (from > to) {
    return {
      failure: error(422, 'invalid_range', 'The start date must be on or before the end date.'),
    };
  }
  return { type, from, to };
}

/** RFC-4180 quoting; the header row uses machine keys, never localized text. */
function toCsv(type, report) {
  const columns = REPORT_COLUMNS[type];
  const escape = (value) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [columns.join(',')];
  for (const row of report.rows) {
    lines.push(columns.map((column) => escape(row[column])).join(','));
  }
  return lines.join('\r\n');
}

/**
 * Reports mock handlers (contract request 21). MOCK ONLY — there is no
 * backend reports endpoint yet; the shapes here are what the UI asked for and
 * are asserted in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - every route requires the bearer token the auth mock issued (401 else)
 *  - `type` must be attendance | leave | tasks (422 invalid_type otherwise)
 *  - `from`/`to` are optional `YYYY-MM-DD`; invalid format → 422 invalid_date,
 *    `from > to` → 422 invalid_range; missing bounds default to the last 30 days
 *  - rows derive from `deriveReport`, the single source both endpoints share
 */
export const reportHandlers = [
  http.get(`${API}/reports`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const parsed = readParams(request);
    if (parsed.failure) return parsed.failure;
    return HttpResponse.json(deriveReport(parsed.type, parsed.from, parsed.to));
  }),

  http.get(`${API}/reports.csv`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const parsed = readParams(request);
    if (parsed.failure) return parsed.failure;
    const report = deriveReport(parsed.type, parsed.from, parsed.to);
    return new HttpResponse(toCsv(parsed.type, report), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="swams-${parsed.type}-${parsed.from}_${parsed.to}.csv"`,
      },
    });
  }),

  /**
   * Period analytics for the /analytics screen (contract request 27).
   * `period` must be week | month | year — anything else is a 422, so a typo
   * can never silently serve the wrong window.
   */
  http.get(`${API}/reports/analytics`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const period = new URL(request.url).searchParams.get('period') ?? '';
    if (!PERIODS.includes(period)) {
      return error(422, 'invalid_period', 'Period must be week, month or year.');
    }
    return HttpResponse.json(deriveAnalytics(period));
  }),
];
