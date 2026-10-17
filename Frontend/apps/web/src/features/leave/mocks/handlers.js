import { http, HttpResponse } from 'msw';
import { isAuthorized } from '../../auth/mocks/authState.js';
import { HOLIDAYS, LEAVE_BALANCE, REQUESTS_MINE, REQUESTS_PENDING } from './fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

/**
 * Leave mock handlers (contract request 14). MOCK ONLY — these endpoints are
 * not in the backend contract yet; the shapes here are what the UI asked for
 * and are asserted in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - every route requires the bearer token the auth mock issued (401 else)
 *  - `GET /leave/requests` filters `mine` | `pending` | `all`
 *  - `POST /leave/requests` echoes a `pending` record with a server id
 *  - `POST /leave/requests/:id/decision` flips the row to approved/rejected
 *    in the fixture store, so the queue can't fake a success the API never gave
 */
const store = {
  mine: REQUESTS_MINE.rows.map((row) => ({ ...row })),
  pending: REQUESTS_PENDING.rows.map((row) => ({ ...row })),
};

export const leaveHandlers = [
  http.get(`${API}/leave/balance`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(LEAVE_BALANCE);
  }),

  http.get(`${API}/leave/holidays`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(HOLIDAYS);
  }),

  http.get(`${API}/leave/requests`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const status = new URL(request.url).searchParams.get('status') ?? 'all';
    if (status === 'mine') return HttpResponse.json({ rows: store.mine });
    if (status === 'pending') return HttpResponse.json({ rows: store.pending });
    return HttpResponse.json({ rows: [...store.mine, ...store.pending] });
  }),

  http.post(`${API}/leave/requests`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    if (!body?.start || !body?.end || !body?.type) {
      return error(422, 'invalid_request', 'Type, start and end are required.');
    }
    if (new Date(body.start) > new Date(body.end)) {
      return error(422, 'invalid_range', 'End date must be on or after the start date.');
    }
    const record = {
      id: `lv_${Math.random().toString(36).slice(2, 8)}`,
      type: body.type,
      start: body.start,
      end: body.end,
      days: body.days ?? 1,
      status: 'pending',
      note: body.note ?? null,
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    store.mine.unshift(record);
    return HttpResponse.json(record, { status: 201 });
  }),

  http.post(`${API}/leave/requests/:id/decision`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    if (body?.decision !== 'approve' && body?.decision !== 'reject') {
      return error(422, 'invalid_decision', 'Decision must be approve or reject.');
    }
    const row = store.pending.find((r) => r.id === params.id);
    if (!row) return error(404, 'not_found', 'That request no longer exists.');
    row.status = body.decision === 'approve' ? 'approved' : 'rejected';
    store.pending = store.pending.filter((r) => r.id !== params.id);
    return HttpResponse.json({ record: row });
  }),
];
