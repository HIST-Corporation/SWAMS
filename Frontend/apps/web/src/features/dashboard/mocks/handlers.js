import { http, HttpResponse } from 'msw';
import { authState, isAuthorized } from '../../auth/mocks/authState.js';
import { FIXTURES } from '../../../mocks/fixtures.js';
import { HR_DASHBOARD, LEAVE_BALANCE, MANAGER_DASHBOARD, OWNER_DASHBOARD, ORG_DASHBOARD, ORG_OVERVIEW, PRESENCE, TEAM_LEAD_DASHBOARD, UPCOMING } from './fixtures.js';
import { STAFF_BOARDS } from './staffBoards.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

/**
 * Dashboard mock handlers (contract requests 11–15, 25 and 26). MOCK ONLY — these
 * endpoints are not in the backend contract yet; the shapes here are what the
 * UI asked for and are asserted in `handlers.test.js`.
 *
 * Mock rules:
 *  - every route requires the bearer token the auth mock issued (401 else)
 *  - rows are static fixtures: nothing mutates, so the widgets can't fake a
 *    success the real API never gave.
 *
 * NOTE: `GET /tasks` (both the `?due=today` compact view and the full board)
 * lives in `features/tasks/mocks/handlers.js` since slice 8 — one store feeds
 * both views so Home and the board can never disagree.
 */
export const dashboardHandlers = [
  http.get(`${API}/leave/balance`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(LEAVE_BALANCE);
  }),

  http.get(`${API}/presence`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(PRESENCE);
  }),

  http.get(`${API}/org/overview`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(ORG_OVERVIEW);
  }),

  http.get(`${API}/events/upcoming`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(UPCOMING);
  }),

  http.get(`${API}/org/dashboard`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(ORG_DASHBOARD);
  }),

  /** HR action queue — pending leave/corrections, exceptions (role: hr). */
  http.get(`${API}/dashboard/hr`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(HR_DASHBOARD);
  }),

  /** Department capacity vs load, risks, approvals (role: manager). */
  http.get(`${API}/dashboard/manager`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(MANAGER_DASHBOARD);
  }),

  /** Team workload, blockers, corrections queue (role: team_lead). */
  http.get(`${API}/dashboard/team-lead`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(TEAM_LEAD_DASHBOARD);
  }),

  /** Org-wide aggregates, headcount, approvals inbox (role: owner). */
  http.get(`${API}/dashboard/owner`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    return HttpResponse.json(OWNER_DASHBOARD);
  }),

  /**
   * The signed-in persona's own work board (contract request 26). The ROLE is
   * read from the session the auth mock issued — never from a query parameter —
   * so one demo account can never ask for another persona's queue.
   */
  http.get(`${API}/staff/board`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const session = FIXTURES.sessions[authState.sessionKey ?? 'hr'];
    const staffRole = session?.user?.staffRole;
    if (!staffRole) {
      return error(403, 'not_a_staff_board', 'The staff board belongs to a staff session.');
    }
    const board = STAFF_BOARDS[staffRole];
    if (!board) return error(404, 'board_not_found', 'This role has no board yet.');
    return HttpResponse.json(board);
  }),
];
