import { http, HttpResponse } from 'msw';
import { authState, isAuthorized } from '../../auth/mocks/authState.js';
import {
  addCorrection,
  applyPunch,
  decideCorrectionRecord,
  state as attendanceState,
} from './attendanceState.js';
import {
  ATTENDANCE_POLICY,
  TEAM_BOARD,
  TODAY_EMPTY,
  TODAY_OPEN,
  attendanceHistory,
  summariseTeam,
} from './fixtures.js';
import { attendanceMonth } from './calendarFixtures.js';
import { FIXTURES } from '../../../mocks/fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

/**
 * Who the mock session is: the signed-in demo persona, straight from their
 * fixture session, so `?status=mine` and a new correction's requester are the
 * same human the shell is showing — Priya when signed in as Priya, Sarah when
 * signed in as HR, and never a name borrowed from another account.
 */
const currentUser = () =>
  FIXTURES.sessions[authState.sessionKey ?? 'hr']?.user ?? FIXTURES.session.user;
const currentRequester = () => currentUser().name;

/**
 * Attendance mock handlers (slice 3). MOCK ONLY — contract rows 2 and 3 in
 * docs/api-contract/contract-requests.md describe what the real API must
 * provide (server time, policy results, batch sync with per-item status).
 *
 * Mock rules:
 *  - `POST /attendance/punch` requires the bearer token the auth mock issued
 *  - repeats of the same `idempotencyKey` return the stored record (dedupe)
 *  - clocking in while a session is open → 409 `already_clocked_in`
 *  - a missing location while the policy requires one is saved and flagged
 *  - a malformed `?date` on `/attendance/team` is 422 `invalid_date`
 *    (limitation: any well-formed date serves the same fixture board — past
 *    days land with the real API, see contract request 24)
 *  - `?scenario=offline` makes the punch fail at the network layer so the UI's
 *    queued/sync states can be exercised by hand
 */
export const attendanceHandlers = [
  http.get(`${API}/attendance/policy`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(ATTENDANCE_POLICY);
  }),

  http.get(`${API}/attendance/today`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    if (attendanceState.openSession) {
      return HttpResponse.json({
        ...TODAY_OPEN,
        session: { ...TODAY_OPEN.session, ...attendanceState.openSession },
      });
    }
    return HttpResponse.json(TODAY_EMPTY);
  }),

  http.get(`${API}/attendance/history`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get('perPage') ?? 10);
    const page = Number(url.searchParams.get('page') ?? 1);
    const all = attendanceHistory();
    const start = (page - 1) * perPage;
    const rows = all.slice(start, start + perPage);
    return HttpResponse.json({ rows, page, perPage, hasMore: start + perPage < all.length });
  }),

  http.get(`${API}/attendance/calendar`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const month = new URL(request.url).searchParams.get('month') ?? '';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return error(422, 'invalid_month', 'The month must be YYYY-MM.');
    }
    return HttpResponse.json(attendanceMonth(month));
  }),

  http.get(`${API}/attendance/team`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const date = new URL(request.url).searchParams.get('date');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error(422, 'invalid_date', 'The team board takes an AD calendar date (YYYY-MM-DD).');
    }
    const rows = TEAM_BOARD.rows.map((row) => {
      // Reflect a real punch made in this mock session onto THAT person's row
      // (the signed-in demo persona, whoever they are).
      const mine = attendanceState.punches.find((p) => p.kind === 'in');
      if (!mine || row.id !== currentUser().id) return row;
      return { ...row, clockIn: '09:02', presence: mine.needsReview ? 'late' : 'in' };
    });
    // The summary is recomputed from the rows the client is being handed, so a
    // live punch can never leave the counts and the list disagreeing (7.6).
    return HttpResponse.json({ summary: summariseTeam(rows), rows });
  }),

  http.get(`${API}/attendance/corrections`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const status = new URL(request.url).searchParams.get('status') ?? 'all';
    const all = attendanceState.corrections ?? [];
    const rows =
      status === 'pending'
        ? all.filter((row) => row.status === 'in_review')
        : status === 'mine'
          ? all.filter((row) => row.requester === currentRequester())
          : all;
    return HttpResponse.json({ rows, page: 1, hasMore: false });
  }),

  http.post(`${API}/attendance/corrections`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    if (!body?.proposed?.clockIn || !body?.proposed?.clockOut) {
      return error(
        422,
        'invalid_correction',
        'A correction needs both a clock-in and a clock-out.',
      );
    }
    if ((body.reason ?? '').trim().length < 5) {
      return error(422, 'reason_required', 'Explain what needs correcting.');
    }
    const record = addCorrection({ ...body, requester: currentRequester() });
    return HttpResponse.json({ id: record.id, status: record.status });
  }),

  http.post(`${API}/attendance/corrections/:id/decision`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    if (!['approve', 'reject', 'request_info'].includes(body?.decision)) {
      return error(422, 'invalid_decision', 'Unknown decision.');
    }
    if (body.decision !== 'approve' && !(body.note ?? '').trim()) {
      return error(422, 'note_required', 'Add a short note so the request can be answered.');
    }
    const record = decideCorrectionRecord(params.id, body.decision, body.note);
    if (!record) return error(404, 'not_found', 'That request no longer exists.');
    return HttpResponse.json({ record });
  }),

  http.post(`${API}/attendance/punch`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');

    const url = new URL(request.url);
    if (url.searchParams.get('scenario') === 'offline') {
      // Emulates a dead network so the queued/sync UI is reachable by hand.
      return HttpResponse.error();
    }

    const body = await request.json().catch(() => null);
    if (!body?.idempotencyKey) {
      return error(422, 'invalid_punch', 'A punch needs an idempotency key.');
    }

    const seen = attendanceState.seenKeys[body.idempotencyKey];
    if (seen) {
      const record = attendanceState.punches.find((p) => p.id === seen);
      if (record) return HttpResponse.json({ record, deduped: true });
    }

    if (body.kind === 'in' && attendanceState.openSession) {
      return error(409, 'already_clocked_in', 'You are already clocked in.');
    }
    if (body.kind === 'out' && !attendanceState.openSession) {
      return error(409, 'not_clocked_in', 'There is no open session to close.');
    }

    const flagged = ATTENDANCE_POLICY.requiresLocation && !body.location;
    const record = applyPunch({
      kind: body.kind,
      idempotencyKey: body.idempotencyKey,
      clientTs: body.clientTs,
      location: body.location,
      needsReview: flagged,
      reason: flagged ? 'no_location' : null,
    });

    return HttpResponse.json({ record, needsReview: flagged, reason: record.reason });
  }),
];
