import { http, HttpResponse } from 'msw';
import { authState, isAuthorized, resetAuthState, setAuth } from './authState.js';
import { FIXTURES } from '../../../mocks/fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

function token() {
  return `mock_at_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Demo accounts from the owner's prototype (`SWAMS_Unified.html`, the DEMO
 * CREDENTIALS card and its staff role picker). The email alone decides which
 * session you get, exactly as the design promises: HR Manager, or one of the
 * four staff personas behind the picker's role cards. Password: `password`
 * (8 characters, so it passes the same ≥ 8 rule every other account does).
 *
 * The keys are session keys in `mocks/fixtures.js` (`staff` is the Frontend
 * persona). `hr@` / `admin@` / `staff@` are the prototype's catch-all addresses
 * and land on the HR and Frontend sessions respectively.
 */
const DEMO_ACCOUNTS = {
  'sarah@swams.com': 'hr',
  'hr@swams.com': 'hr',
  'admin@swams.com': 'hr',
  // Six-role model management accounts (docs/frontend/role-permission-matrix.md).
  'aarav@swams.com': 'ceo',
  'ramesh@swams.com': 'manager',
  'anita@swams.com': 'teamLead',
  'priya@swams.com': 'staff',
  'staff@swams.com': 'staff',
  'james@swams.com': 'be',
  'tina@swams.com': 'qa',
  'raj@swams.com': 'devops',
};

/**
 * Auth mock handlers (slice 2, contract row 4). MOCK ONLY — the real backend
 * uses httpOnly cookies for refresh and never returns long-lived tokens.
 *
 * Mock rules (documented, deterministic):
 *  - any syntactically valid email + password ≥ 8 chars signs in
 *  - the demo accounts above pick their own portal (Sarah → HR, Priya → Staff)
 *  - every other email uses portal 'staff' | 'hr' from the login role picker
 *  - mfa@himaldigital.com.np triggers the MFA challenge; any 6-digit code passes
 *  - POST /auth/forgot-password always answers 202 for a valid email shape
 *    (the real backend emails a one-time link; never reveals account existence)
 *  - GET /me requires the bearer token issued by this mock (signed out → 401)
 */
export const authHandlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!body || !EMAIL_RE.test(body.email ?? '')) {
      return error(422, 'invalid_email', 'Enter a valid email address.');
    }
    if (typeof body.password !== 'string' || body.password.length < 8) {
      return error(422, 'weak_password', 'Password must be at least 8 characters.');
    }
    // A demo address carries its own session, so the role picker can never
    // send Sarah to a staff board (or the reverse); every other address uses
    // the portal from the login form.
    const persona = DEMO_ACCOUNTS[body.email] ?? (body.portal === 'staff' ? 'staff' : 'hr');
    if (body.email === 'mfa@himaldigital.com.np') {
      setAuth({ pendingMfa: token(), pendingPortal: persona === 'hr' ? 'hr' : 'staff' });
      return HttpResponse.json({ mfaRequired: true });
    }
    return signedInResponse(persona);
  }),

  http.post(`${API}/auth/mfa`, async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!authState.pendingMfa)
      return error(409, 'no_mfa_challenge', 'No MFA challenge in progress.');
    if (!/^\d{6}$/.test(body?.code ?? '')) {
      return error(422, 'invalid_code', 'Enter the 6-digit code.');
    }
    setAuth({ pendingMfa: null });
    return signedInResponse(body.portal === 'hr' ? 'hr' : (authState.pendingPortal ?? 'staff'));
  }),

  http.post(`${API}/auth/forgot-password`, async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!body || !EMAIL_RE.test(body.email ?? '')) {
      return error(422, 'invalid_email', 'Enter a valid email address.');
    }
    // Enumeration-safe by design: the same 202 whether or not the account
    // exists, so the response never reveals who has a seat.
    return HttpResponse.json({ status: 'sent' }, { status: 202 });
  }),

  http.post(`${API}/auth/refresh`, () => {
    // Like the real httpOnly cookie: presence of the stored mock session is
    // the authority — the client may have no bearer token after a reload.
    if (!authState.token) return error(401, 'session_ended', 'Sign in again.');
    const sessionKey = authState.sessionKey ?? 'hr';
    const accessToken = token();
    // Token rotation, like the real endpoint: the issued token becomes the
    // accepted bearer (the client stores it in memory). Without this, a
    // reloaded page would authenticate against a token the mock rejects and
    // bounce a valid session to /login.
    setAuth({ token: accessToken });
    return HttpResponse.json({
      accessToken,
      session: FIXTURES.sessions[sessionKey],
    });
  }),

  http.post(`${API}/auth/logout`, () => {
    resetAuthState();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/me`, ({ request }) => {
    if (!isAuthorized(request)) {
      return error(401, 'unauthenticated', 'Sign in to continue.');
    }
    return HttpResponse.json(FIXTURES.sessions[authState.sessionKey ?? 'hr']);
  }),

  http.patch(`${API}/me/preferences`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => ({}));
    // Merge like a real preferences endpoint: unknown keys are ignored by the
    // server contract, known ones update and echo back the full object, and
    // GET /me reflects the change so the session and the profile agree.
    const key = authState.sessionKey ?? 'hr';
    const session = FIXTURES.sessions[key];
    const merged = { ...session.preferences, ...body };
    session.preferences = merged;
    FIXTURES.session.preferences = merged;
    return HttpResponse.json(merged);
  }),

  http.post(`${API}/org/setup`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    if (!body?.name) return error(422, 'invalid_org', 'Organization name is required.');
    return HttpResponse.json({ org: { ...FIXTURES.org, name: body.name }, status: 'configured' });
  }),
];

/**
 * Issue a session for one demo persona. An unknown key falls back to HR, so a
 * bad request can never authenticate as nobody.
 * @param {string} persona session key in `FIXTURES.sessions`
 */
function signedInResponse(persona) {
  const sessionKey = FIXTURES.sessions[persona] ? persona : 'hr';
  const accessToken = token();
  setAuth({ sessionKey, token: accessToken });
  return HttpResponse.json({ accessToken, session: FIXTURES.sessions[sessionKey] });
}
