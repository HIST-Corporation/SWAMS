import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { authHandlers } from './handlers.js';
import { authState, resetAuthState, setAuth } from './authState.js';
import { FIXTURES } from '../../../mocks/fixtures.js';

/**
 * Contract coverage for the auth mock (mock-first development, §5). These
 * assertions describe what the real backend must provide — if the mock drifts
 * from the documented rule (handlers.js header), this test fails.
 *
 * Covers the documented mock rules: login validation, the MFA challenge,
 * refresh-as-cookie-authority, logout reset, /me auth gating, and the
 * enumeration-safe forgot-password response (contract request 16).
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetAuthState());
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

describe('auth mock contract', () => {
  it('rejects a malformed email on login with the AppError shape', async () => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nope', password: 'long-enough-pw' }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'invalid_email' });
    expect(body.requestId).toBeTruthy();
  });

  it('rejects a weak password on login', async () => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sita@himaldigital.com.np', password: 'short' }),
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'weak_password' });
  });

  it('issues an access token + session for valid credentials', async () => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sita@himaldigital.com.np', password: 'correct-horse-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.session).toMatchObject({ user: expect.any(Object) });
  });

  it('routes the design demo accounts to their own portal', async () => {
    // Sarah's email is the authority, even if the picker said "staff".
    const sarah = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@swams.com', password: 'password', portal: 'staff' }),
    });
    expect(sarah.status).toBe(200);
    expect((await sarah.json()).session.principal.role).toBe('hr');
    expect(authState.sessionKey).toBe('hr');

    const priya = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya@swams.com', password: 'password', portal: 'hr' }),
    });
    expect((await priya.json()).session.principal.role).toBe('staff');
  });

  it('gives every demo address its own persona session', async () => {
    // The prototype's demo cast: one HR account plus the four staff personas
    // behind its role cards. The email decides, so the picker cannot route a
    // persona to another board.
    const cases = [
      ['sarah@swams.com', 'hr', 'Sarah Mitchell', null],
      ['priya@swams.com', 'staff', 'Priya Sharma', 'fe'],
      ['james@swams.com', 'be', 'James Wilson', 'be'],
      ['tina@swams.com', 'qa', 'Tina Nguyen', 'qa'],
      ['raj@swams.com', 'devops', 'Raj Kumar', 'devops'],
    ];

    for (const [email, sessionKey, name, staffRole] of cases) {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A wrong portal on purpose: the address still wins.
        body: JSON.stringify({ email, password: 'password', portal: 'hr' }),
      });
      expect(res.status, email).toBe(200);
      const { session } = await res.json();
      expect(authState.sessionKey, email).toBe(sessionKey);
      expect(session.user.name, email).toBe(name);
      expect(session.user.staffRole ?? null, email).toBe(staffRole);

      // `/me` hands back the same persona (with the token login just issued),
      // so the shell's identity and job title follow.
      const header = { Authorization: `Bearer ${authState.token}` };
      const me = await (await fetch(`${base}/me`, { headers: header })).json();
      expect(me.user.name, email).toBe(name);
      expect(me.user.staffRole ?? null, email).toBe(staffRole);
    }
  });

  it('falls back to the HR session for an unknown persona key', async () => {
    // A bad request must never authenticate as nobody (or as a made-up role).
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'someone@company.com', password: 'password' }),
    });
    const { session } = await res.json();
    expect(session.principal.role).toBe('hr');
    expect(authState.sessionKey).toBe('hr');
  });

  it('starts an MFA challenge for the mfa fixture email', async () => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mfa@himaldigital.com.np', password: 'correct-horse-1' }),
    });
    expect(await res.json()).toEqual({ mfaRequired: true });
    expect(authState.pendingMfa).toBeTruthy();
  });

  it('401s /me without the bearer token the mock issued', async () => {
    const res = await fetch(`${base}/me`);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('returns the fixture session for /me with a token', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const res = await fetch(`${base}/me`, { headers: auth });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject(FIXTURES.sessions.staff);
  });

  it('401s refresh when no mock session exists (cookie is authority)', async () => {
    const res = await fetch(`${base}/auth/refresh`, { method: 'POST' });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'session_ended' });
  });

  it('204s logout and clears the mock session', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const res = await fetch(`${base}/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(authState.token).toBeNull();
  });

  it('answers the same 202 for forgot-password whether or not the account exists', async () => {
    const request = (email) =>
      fetch(`${base}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

    const known = await request('sita@himaldigital.com.np');
    const unknown = await request('nobody@example.com');
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    // Identical bodies → no account-existence leak through content either.
    expect(await known.json()).toEqual(await unknown.json());
  });

  it('rejects a malformed email on forgot-password with 422', async () => {
    const res = await fetch(`${base}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nope' }),
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'invalid_email' });
  });

  it('merges a preferences patch and keeps GET /me in agreement', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const before = { ...FIXTURES.sessions.staff.preferences };
    try {
      const res = await fetch(`${base}/me/preferences`, {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      });
      expect(res.status).toBe(200);
      // The patch merges — untouched preferences come back with it.
      expect(await res.json()).toMatchObject({ theme: 'dark', language: before.language });

      const me = await (await fetch(`${base}/me`, { headers: auth })).json();
      expect(me.preferences.theme).toBe('dark');
    } finally {
      FIXTURES.sessions.staff.preferences = before;
      FIXTURES.session.preferences = before;
    }
  });

  it('401s a preferences patch without the bearer token', async () => {
    const res = await fetch(`${base}/me/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'dark' }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'unauthenticated' });
  });
});
