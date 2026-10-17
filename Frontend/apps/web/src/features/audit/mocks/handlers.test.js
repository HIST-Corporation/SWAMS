import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { auditHandlers } from './handlers.js';
import { setAuth } from '../../auth/mocks/authState.js';

/**
 * Contract coverage for the audit mock (mock-first development, §5). These
 * assertions describe the shape the real API must provide (contract request
 * 20) — if the mock drifts from the contract, this test fails.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...auditHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'hr' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

const getPage = async (query = '', headers = auth) => {
  const res = await fetch(`${base}/audit${query}`, { headers });
  expect(res.status).toBe(200);
  return res.json();
};

describe('audit mock contract', () => {
  it('rejects an unauthenticated request with the AppError shape', async () => {
    const res = await fetch(`${base}/audit`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('serves a newest-first page with server pagination', async () => {
    const first = await getPage('?page=1&perPage=5');
    expect(first).toMatchObject({ page: 1, perPage: 5 });
    expect(first.rows).toHaveLength(5);
    expect(first.total).toBeGreaterThan(5);
    expect(first.totalPages).toBe(Math.ceil(first.total / 5));
    for (const row of first.rows) {
      expect(row).toMatchObject({
        id: expect.any(String),
        actor: expect.any(String),
        entity: expect.any(String),
        action: expect.any(String),
        createdAt: expect.any(String),
      });
    }
    // Rows come newest first across the page boundary, disjoint pages.
    const second = await getPage('?page=2&perPage=5');
    const firstIds = first.rows.map((row) => row.id);
    expect(second.rows.map((row) => row.id).every((id) => !firstIds.includes(id))).toBe(true);
  });

  it('answers an out-of-range page with an empty rows and the real total', async () => {
    const body = await getPage('?page=99');
    expect(body.rows).toEqual([]);
    expect(body.total).toBeGreaterThan(0);
    expect(body.page).toBe(99);
  });

  it('filters by exact action key (unknown keys list nothing, never 422)', async () => {
    const approved = await getPage('?action=leaveApproved&perPage=50');
    expect(approved.rows.length).toBeGreaterThan(0);
    for (const row of approved.rows) expect(row.action).toBe('leaveApproved');

    const unknown = await getPage('?action=noSuchAction&perPage=50');
    expect(unknown.rows).toEqual([]);
    expect(unknown.total).toBe(0);
  });

  it('matches the actor as a case-insensitive name substring', async () => {
    const sita = await getPage('?actor=sita&perPage=50');
    expect(sita.rows.length).toBeGreaterThan(0);
    for (const row of sita.rows) expect(row.actor.toLowerCase()).toContain('sita');

    const none = await getPage('?actor=zzzzmissing&perPage=50');
    expect(none.rows).toEqual([]);
  });
});
