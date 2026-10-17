import { http, HttpResponse } from 'msw';
import { authState, isAuthorized } from '../../auth/mocks/authState.js';
import { NOTIFICATIONS } from './fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

/** The mock never leaks the fixture's `audience` scope to the client. */
function toRow({ audience, ...row }) {
  void audience;
  return row;
}

/**
 * Notification mock handlers (contract requests 17–19). MOCK ONLY — these
 * endpoints are not in the backend contract yet; the shapes here are what the
 * UI asked for and are asserted in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - every route requires the bearer token the auth mock issued (401 else)
 *  - rows are filtered to the signed-in mock portal (`audience`)
 *  - read flags live in this module's store, so a mark-read really changes
 *    what the next GET returns — the panel can't fake a success
 */
const store = NOTIFICATIONS.map((row) => ({ ...row }));

/**
 * Restore the fixture read flags (tests only): the store is a copy of the
 * fixtures, so mutating fixtures alone would never reset it.
 */
export function resetNotificationStore() {
  store.length = 0;
  store.push(...NOTIFICATIONS.map((row) => ({ ...row })));
}

export const notificationHandlers = [
  http.get(`${API}/notifications`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const portal = authState.sessionKey === 'staff' ? 'staff' : 'hr';
    const rows = store
      .filter((row) => row.audience === 'all' || row.audience === portal)
      .map(toRow);
    return HttpResponse.json({ rows });
  }),

  http.post(`${API}/notifications`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    const allowed = new Set(['callRequested']);
    if (!allowed.has(body?.key)) {
      return error(422, 'invalid_notification', 'Unknown notification kind.');
    }
    const record = {
      id: `ntf_${Math.random().toString(36).slice(2, 10)}`,
      audience: 'all',
      kind: body.kind ?? 'call',
      key: body.key,
      params: body.params ?? {},
      createdAt: new Date().toISOString(),
      read: false,
      link: body.link ?? '/video',
    };
    store.unshift(record);
    return HttpResponse.json({ record: toRow(record) }, { status: 201 });
  }),

  // Registered before `:id/read` for readability; the segment counts differ,
  // so the two routes can never collide.
  http.post(`${API}/notifications/read-all`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    let updated = 0;
    for (const row of store) {
      if (!row.read) {
        row.read = true;
        updated += 1;
      }
    }
    return HttpResponse.json({ updated });
  }),

  http.post(`${API}/notifications/:id/read`, ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const row = store.find((candidate) => candidate.id === params.id);
    if (!row) return error(404, 'not_found', 'That notification no longer exists.');
    row.read = true;
    return HttpResponse.json({ record: toRow({ ...row }) });
  }),
];
