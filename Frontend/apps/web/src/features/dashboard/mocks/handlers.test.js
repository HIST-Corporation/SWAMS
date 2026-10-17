import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { dashboardHandlers } from './handlers.js';
import { setAuth } from '../../auth/mocks/authState.js';
import { ROSTER } from '../../../mocks/fixtures.js';
import { resources } from '@swams/i18n';

/** Resolve an `a.b.c` key against a catalog namespace, or `undefined`. */
function lookup(catalog, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), catalog);
}

/**
 * Contract coverage for the dashboard mock (mock-first development, §5).
 * These assertions describe the shape the real API must provide (contract
 * requests 12–15) — if the mock drifts from the contract, this test fails.
 *
 * NOTE: task serving (`GET /tasks`, contract request 11 + 22) lives in the
 * tasks feature's mock since slice 8 — its two tests moved there, so the
 * compact view and the board views are asserted against ONE store.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...dashboardHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'staff' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

describe('dashboard mock contract', () => {
  it('serves a leave balance the UI reads without computing entitlements', async () => {
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
    // The numbers must reconcile — Home shows `remaining` verbatim.
    expect(annual.remaining).toBe(annual.entitled - annual.used - annual.pending);
  });

  it('401s the org board without the bearer token the auth mock issued', async () => {
    const res = await fetch(`${base}/org/dashboard`);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('unauthenticated');
  });

  it('serves one org board whose figures agree with each other', async () => {
    const res = await fetch(`${base}/org/dashboard`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();

    // The KPI row and the workforce donut read THIS one payload, so the four
    // tiles and the donut's centre can never state different numbers.
    expect(body.kpi.present).toBe(body.presence.present + body.presence.late);
    expect(body.kpi.headcount).toBe(body.presence.expected);
    expect(body.kpi.present + body.kpi.onLeave + body.kpi.absent).toBe(body.kpi.headcount);

    // The trend's last point IS today's rate — no second source for it — and
    // the series is ordered oldest first, one point per day.
    const dates = body.trend.points.map((point) => point.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
    expect(body.trend.points.at(-1).rate).toBe(body.kpi.rate);
    for (const point of body.trend.points) {
      expect(point.rate).toBeGreaterThan(0);
      expect(point.rate).toBeLessThanOrEqual(100);
    }
    expect(body.asOf).toBe(body.trend.points.at(-1).date);

    // Every rate the client renders as a percentage is a 0–100 number.
    for (const dept of body.departments) {
      expect(dept).toMatchObject({ id: expect.any(String), name: expect.any(String) });
      expect(dept.rate).toBeGreaterThan(0);
      expect(dept.rate).toBeLessThanOrEqual(100);
    }

    // The insight that quotes a leading department quotes the bar chart's own
    // number, so the sentence and the panel cannot disagree.
    const trendInsight = body.insights.find((row) => row.kind === 'trend');
    expect(trendInsight.params.rate).toBe(body.departments[0].rate);
    expect(trendInsight.params.team).toBe(body.departments[0].name);
  });

  it('names every insight, department and benchmark in i18n keys both catalogs define', async () => {
    const res = await fetch(`${base}/org/dashboard`, { headers: auth });
    const body = await res.json();

    const needed = [
      ...body.insights.flatMap((row) => [row.titleKey, row.bodyKey]),
      ...body.benchmarks.map((row) => `bench.metric.${row.metric}`),
      // `percent` is formatted by the client (the % sign), so only the count
      // units carry a catalog wrapper.
      ...body.benchmarks
        .filter((row) => row.unit !== 'percent')
        .map((row) => `bench.unit.${row.unit}`),
      'bench.status.better',
      'bench.status.low',
      'bench.status.high',
    ];

    for (const key of needed) {
      expect(typeof lookup(resources.en.dashboard, key), `en:${key}`).toBe('string');
      expect(typeof lookup(resources.ne.dashboard, key), `ne:${key}`).toBe('string');
    }

    // Only the three statuses the table tints exist — a fourth would render an
    // untranslated badge.
    const statuses = new Set(body.benchmarks.map((row) => row.status));
    for (const status of statuses) expect(['better', 'low', 'high']).toContain(status);
    const units = new Set(body.benchmarks.map((row) => row.unit));
    for (const unit of units) expect(['percent', 'perMonth', 'perWeek']).toContain(unit);
  });

  it('serves presence rows straight off the shared roster', async () => {
    const res = await fetch(`${base}/presence`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    const allowed = new Set(['in', 'late', 'leave', 'out']);

    // One roster, many lists: the strip names every person the roster names,
    // in the same order, with the same initials — not a second hand-written
    // copy that can drift (Section 7.6).
    expect(body.rows.map((row) => row.id)).toEqual(ROSTER.map((person) => person.id));
    for (const row of body.rows) {
      expect(row).toMatchObject({
        name: expect.any(String),
        initials: expect.any(String),
        site: expect.any(String),
      });
      expect(allowed.has(row.presence)).toBe(true);
    }
  });

  it('serves one staff board per persona, picked from the session', async () => {
    const personas = ['staff', 'be', 'qa', 'devops'];
    const queues = [];

    for (const sessionKey of personas) {
      setAuth({ token: 'tok_test', sessionKey });
      const res = await fetch(`${base}/staff/board`, { headers: auth });
      expect(res.status, sessionKey).toBe(200);
      const body = await res.json();

      // The counts are the payload's own and must describe the queue beside
      // them — a header that cannot count its own rows would be fiction (7.6).
      const total = Object.values(body.counts).reduce((sum, n) => sum + n, 0);
      expect(total, sessionKey).toBe(body.queue.length);

      for (const item of body.queue) {
        expect(item).toMatchObject({
          id: expect.any(String),
          kind: expect.any(String),
          status: expect.any(String),
          priority: expect.any(String),
          title: expect.any(String),
          meta: expect.any(String),
        });
        // `due` is a calendar date or null — the client formats, never invents.
        expect(item.due === null || /^\d{4}-\d{2}-\d{2}$/.test(item.due), item.id).toBe(true);

        // Every word on the board resolves in BOTH catalogs (Section 8.10).
        const keys = [
          `board.kind.${item.kind}`,
          `board.status.${item.status}`,
          `board.priority.${item.priority}`,
        ];
        for (const key of keys) {
          expect(typeof lookup(resources.en.dashboard, key), `en:${key}`).toBe('string');
          expect(typeof lookup(resources.ne.dashboard, key), `ne:${key}`).toBe('string');
        }
      }

      // The pod is roster people, resolved server-side: same names, initials
      // and sites the directory and the presence strip print for those ids.
      expect(body.pod.length, sessionKey).toBeGreaterThan(0);
      for (const person of body.pod) {
        const rosterPerson = ROSTER.find((row) => row.id === person.id);
        expect(rosterPerson, person.id).toBeTruthy();
        expect(person.name).toBe(rosterPerson.name);
        expect(person.site).toBe(rosterPerson.site);
        expect(['in', 'late', 'leave', 'out']).toContain(person.presence);
      }

      queues.push(body.queue.map((item) => item.id).join(','));
    }

    // Four personas, four DIFFERENT queues — otherwise the login's promise
    // ("each role is its own account") is a lie.
    expect(new Set(queues).size).toBe(4);

    // Leave the session as the suite found it.
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
  });

  it('401s the staff board without a token, and 403s an HR session', async () => {
    const anonymous = await fetch(`${base}/staff/board`);
    expect(anonymous.status).toBe(401);

    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const reviewer = await fetch(`${base}/staff/board`, { headers: auth });
    expect(reviewer.status).toBe(403);
    expect((await reviewer.json()).code).toBe('not_a_staff_board');

    setAuth({ token: 'tok_test', sessionKey: 'staff' });
  });
});
