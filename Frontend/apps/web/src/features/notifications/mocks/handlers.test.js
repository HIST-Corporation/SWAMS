import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { notificationHandlers, resetNotificationStore } from './handlers.js';
import { resetAuthState, setAuth } from '../../auth/mocks/authState.js';

/**
 * Contract coverage for the notifications mock (mock-first development, §5).
 * These assertions describe the shape the real API must provide (contract
 * requests 17–19) — if the mock drifts from the contract, this test fails.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...notificationHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'hr' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  // The store (not the fixtures) owns read flags — reset it, then re-auth.
  resetNotificationStore();
  resetAuthState();
  setAuth({ token: 'tok_test', sessionKey: 'hr' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

const getRows = async (headers = auth) => {
  const res = await fetch(`${base}/notifications`, { headers });
  expect(res.status).toBe(200);
  return (await res.json()).rows;
};

describe('notifications mock contract', () => {
  it('rejects an unauthenticated request with the AppError shape', async () => {
    const res = await fetch(`${base}/notifications`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('serves rows the panel can render without deriving anything', async () => {
    const rows = await getRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toMatchObject({
        id: expect.any(String),
        kind: expect.any(String),
        key: expect.any(String),
        createdAt: expect.any(String),
        read: expect.any(Boolean),
      });
      // The fixture's audience scope must never reach the client.
      expect(row).not.toHaveProperty('audience');
    }
  });

  it('marks one row read and shows it read on the next fetch', async () => {
    const before = await getRows();
    const target = before.find((row) => !row.read);
    expect(target).toBeTruthy();

    const res = await fetch(`${base}/notifications/${target.id}/read`, {
      method: 'POST',
      headers: auth,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ record: { id: target.id, read: true } });

    const after = await getRows();
    expect(after.find((row) => row.id === target.id).read).toBe(true);
  });

  it('404s a mark-read for an unknown notification', async () => {
    const res = await fetch(`${base}/notifications/ntf_missing/read`, {
      method: 'POST',
      headers: auth,
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'not_found' });
  });

  it('marks everything read in one call', async () => {
    const res = await fetch(`${base}/notifications/read-all`, { method: 'POST', headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBeGreaterThanOrEqual(1);

    const rows = await getRows();
    expect(rows.every((row) => row.read)).toBe(true);
  });

  it('scopes rows to the signed-in mock portal', async () => {
    setAuth({ token: 'tok_staff', sessionKey: 'staff' });
    const staffRows = await getRows({ Authorization: 'Bearer tok_staff' });
    // The HR-only fixture row must not appear for the staff portal.
    expect(staffRows.some((row) => row.id === 'ntf_lv_req')).toBe(false);
    expect(staffRows.length).toBeGreaterThan(0);
  });
});
