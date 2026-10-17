import { http, HttpResponse } from 'msw';
import { isAuthorized } from '../../auth/mocks/authState.js';
import { AUDIT_ENTRIES } from './fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const DEFAULT_PER_PAGE = 10;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

/**
 * Audit mock handler (contract request 20). MOCK ONLY — there is no backend
 * audit endpoint yet; the shape here is what the UI asked for and is asserted
 * in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - requires the bearer token the auth mock issued (401 else)
 *  - `action` filters by exact action key (unknown keys → empty list, not 422)
 *  - `actor` matches a case-insensitive name substring
 *  - `page`/`perPage` paginate server-side; out-of-range pages return an
 *    empty `rows` with the real `total`, never a fabricated page
 */
export const auditHandlers = [
  http.get(`${API}/audit`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const params = new URL(request.url).searchParams;

    const action = params.get('action') || undefined;
    const actor = (params.get('actor') || '').trim().toLowerCase();
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
    const perPage = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(params.get('perPage') ?? String(DEFAULT_PER_PAGE), 10) || DEFAULT_PER_PAGE,
      ),
    );

    const filtered = AUDIT_ENTRIES.filter(
      (row) =>
        (!action || row.action === action) && (!actor || row.actor.toLowerCase().includes(actor)),
    );
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const rows = filtered.slice((page - 1) * perPage, page * perPage);

    return HttpResponse.json({ rows, page, perPage, total, totalPages });
  }),
];
