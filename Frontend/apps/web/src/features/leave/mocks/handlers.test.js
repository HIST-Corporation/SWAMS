import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { leaveHandlers } from './handlers.js';
import { setAuth } from '../../auth/mocks/authState.js';

/**
 * Contract coverage for the leave mock (mock-first development, §5). These
 * assertions describe the shape the real API must provide (contract request
 * 14) — if the mock drifts from the contract, this test fails.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...leaveHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'staff' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

describe('leave mock contract', () => {
  it('rejects an unauthenticated request with the AppError shape', async () => {
    const res = await fetch(`${base}/leave/balance`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('serves a balance the UI reads without computing entitlements', async () => {
    const res = await fetch(`${base}/leave/balance`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    const annual = body.rows.find((row) => row.type === 'annual');
    expect(annual).toMatchObject({
      entitled: expect.any(Number),
      used: expect.any(Number),
      pending: expect.any(Number),
      remaining: expect.any(Number),
    });
    // The numbers must reconcile — the UI shows `remaining` verbatim (§7.6).
    expect(annual.remaining).toBe(annual.entitled - annual.used - annual.pending);
  });

  it('filters requests by status', async () => {
    const mine = await (
      await fetch(`${base}/leave/requests?status=mine`, { headers: auth })
    ).json();
    const pending = await (
      await fetch(`${base}/leave/requests?status=pending`, { headers: auth })
    ).json();
    expect(mine.rows.length).toBeGreaterThan(0);
    expect(pending.rows.length).toBeGreaterThan(0);
    // The bench rows carry an employee the requester rows never need.
    expect(pending.rows[0]).toHaveProperty('employee');
    for (const row of mine.rows) expect(row).not.toHaveProperty('employee');
  });

  it('serves holidays the form can flag', async () => {
    const res = await fetch(`${base}/leave/holidays`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const row of body.rows) {
      expect(row).toMatchObject({ date: expect.any(String), name: expect.any(String) });
    }
  });

  it('creates a request that comes back pending, never approved', async () => {
    const res = await fetch(`${base}/leave/requests`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'annual', start: '2026-12-01', end: '2026-12-02' }),
    });
    expect(res.status).toBe(201);
    const record = await res.json();
    expect(record).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      days: expect.any(Number),
    });
  });

  it('rejects an end date before the start date', async () => {
    const res = await fetch(`${base}/leave/requests`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'annual', start: '2026-12-10', end: '2026-12-01' }),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'invalid_range' });
  });

  it('applies a decision and removes the row from the bench', async () => {
    const before = await (
      await fetch(`${base}/leave/requests?status=pending`, { headers: auth })
    ).json();
    const id = before.rows[0].id;
    const res = await fetch(`${base}/leave/requests/${id}/decision`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(res.status).toBe(200);
    const { record } = await res.json();
    expect(record.status).toBe('approved');

    const after = await (
      await fetch(`${base}/leave/requests?status=pending`, { headers: auth })
    ).json();
    expect(after.rows.find((r) => r.id === id)).toBeUndefined();
  });

  it('rejects an unknown decision value', async () => {
    const res = await fetch(`${base}/leave/requests/lv_x/decision`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ decision: 'maybe' }),
    });
    expect(res.status).toBe(422);
  });
});
