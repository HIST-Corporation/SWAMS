import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { calendarHandlers } from './handlers.js';
import { setAuth } from '../../auth/mocks/authState.js';

/**
 * Contract coverage for the calendar mock (mock-first development, §5). These
 * assertions describe the shape the real API must provide (contract request
 * 23) — if the mock drifts from the contract, this test fails.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...calendarHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'staff' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

describe('calendar mock contract', () => {
  it('rejects an unauthenticated request with the AppError shape', async () => {
    const res = await fetch(`${base}/calendar?from=2026-10-01&to=2026-10-31`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('422s malformed dates, inverted ranges and outsize ranges', async () => {
    const malformed = await fetch(`${base}/calendar?from=10/01/2026&to=2026-10-31`, {
      headers: auth,
    });
    expect(malformed.status).toBe(422);
    expect(await malformed.json()).toMatchObject({ code: 'invalid_date' });

    const inverted = await fetch(`${base}/calendar?from=2026-10-31&to=2026-10-01`, {
      headers: auth,
    });
    expect(inverted.status).toBe(422);
    expect(await inverted.json()).toMatchObject({ code: 'invalid_range' });

    const yearly = await fetch(`${base}/calendar?from=2026-01-01&to=2026-12-31`, { headers: auth });
    expect(yearly.status).toBe(422);
    expect(await yearly.json()).toMatchObject({ code: 'range_too_long' });
  });

  it('serves event-bearing days sorted ascending within echoing bounds', async () => {
    const res = await fetch(`${base}/calendar?from=2026-10-01&to=2026-10-31`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
    expect(body.days.length).toBeGreaterThan(0);
    const dates = body.days.map((day) => day.date);
    expect([...dates].sort()).toEqual(dates);
    for (const day of body.days) {
      expect(day.date >= '2026-10-01' && day.date <= '2026-10-31').toBe(true);
      expect(day.events.length).toBeGreaterThan(0);
      for (const event of day.events) {
        expect(['leave', 'holiday', 'meeting']).toContain(event.kind);
        expect(event.title).toEqual(expect.any(String));
      }
    }
  });

  it('lists nothing — never 422 — where the fixtures hold no events', async () => {
    const res = await fetch(`${base}/calendar?from=2026-01-01&to=2026-01-07`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toEqual([]);
  });
});
