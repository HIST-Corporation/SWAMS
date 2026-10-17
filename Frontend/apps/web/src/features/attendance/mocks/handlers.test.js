import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { attendanceHandlers } from './handlers.js';
import { mockTodayIso } from './fixtures.js';
import { resetAttendanceState, state } from './attendanceState.js';
import { setAuth } from '../../auth/mocks/authState.js';
import { ROSTER, initialsOf } from '../../../mocks/fixtures.js';

/**
 * Contract coverage for the attendance mock (mock-first development, §5).
 * These assertions describe the shape the real API must provide — if the mock
 * drifts from the contract, this test fails.
 */
// `msw/node` has no `location`, and our handlers use document-relative paths
// (they run against whatever origin serves the app in the browser). Give node
// an origin so relative matching works exactly as it does in the browser.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...attendanceHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'staff' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  resetAttendanceState();
  server.resetHandlers();
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1/attendance';

describe('attendance mock contract', () => {
  it('rejects an unauthenticated request with the AppError shape', async () => {
    const res = await fetch(`${base}/policy`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('serves the punch policy with the sites it fences', async () => {
    const res = await fetch(`${base}/policy`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requiresLocation).toBe(true);
    expect(body.sites.map((s) => s.name)).toContain('Baneshwor');
  });

  it('serves an empty day before any punch', async () => {
    const res = await fetch(`${base}/today`, { headers: auth });
    const body = await res.json();
    expect(body.session).toBeNull();
  });

  it('serves a whole month of day statuses for the calendar', async () => {
    const res = await fetch(`${base}/calendar?month=2026-10`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.month).toBe('2026-10');
    expect(body.days).toHaveLength(31);
    // Every past day carries the UI's own status id; future days carry none.
    for (const day of body.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (day.date > mockTodayIso()) {
        expect(day.status).toBeNull();
      } else {
        expect(['present', 'late', 'absent', 'half_day', 'leave', 'holiday']).toContain(day.status);
      }
    }
    // The calendar window never disagrees with the history window about a day.
    const history = await (
      await fetch(`${base}/history?page=1&perPage=14`, { headers: auth })
    ).json();
    const byDate = new Map(body.days.map((day) => [day.date, day.status]));
    const inMonth = history.rows.filter((row) => row.date.startsWith('2026-10'));
    expect(inMonth.length).toBeGreaterThan(0);
    for (const row of inMonth) {
      expect(byDate.get(row.date)).toBe(row.status);
    }
  });

  it('rejects a malformed calendar month with 422', async () => {
    const res = await fetch(`${base}/calendar?month=octor`, { headers: auth });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('invalid_month');
  });

  it('pages history and reports hasMore', async () => {
    const res = await fetch(`${base}/history?page=1&perPage=10`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(10);
    expect(body.hasMore).toBe(true);
    // Newest-first: the top row is the mock's "today" (see mockTodayIso).
    expect(body.rows[0]).toMatchObject({ date: mockTodayIso(), status: 'present' });

    const last = await (await fetch(`${base}/history?page=2&perPage=10`, { headers: auth })).json();
    expect(last.rows).toHaveLength(4);
    expect(last.hasMore).toBe(false);
  });

  it('records a clock-in, then refuses a second clock-in with 409', async () => {
    const first = await fetch(`${base}/punch`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'in', idempotencyKey: 'k1', clientTs: '2026-10-09T03:17:00Z' }),
    });
    expect(first.status).toBe(200);
    const { record, needsReview } = await first.json();
    expect(record.kind).toBe('in');
    // no location + policy requires it → saved, flagged for review
    expect(needsReview).toBe(true);
    expect(record.reason).toBe('no_location');

    const again = await fetch(`${base}/punch`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'in', idempotencyKey: 'k2', clientTs: '2026-10-09T03:20:00Z' }),
    });
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe('already_clocked_in');
  });

  it('dedupes a repeat idempotency key instead of double-punching', async () => {
    const body = JSON.stringify({
      kind: 'in',
      idempotencyKey: 'same',
      clientTs: '2026-10-09T03:17:00Z',
    });
    const headers = { ...auth, 'Content-Type': 'application/json' };
    const first = await (await fetch(`${base}/punch`, { method: 'POST', headers, body })).json();
    const second = await (await fetch(`${base}/punch`, { method: 'POST', headers, body })).json();
    expect(second.deduped).toBe(true);
    expect(second.record.id).toBe(first.record.id);
    expect(state.punches).toHaveLength(1);
  });

  it('a clean punch with a location is not flagged', async () => {
    const res = await fetch(`${base}/punch`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'in',
        idempotencyKey: 'k3',
        clientTs: '2026-10-09T03:17:00Z',
        location: { lat: 27.6895, lng: 85.3415 },
      }),
    });
    const body = await res.json();
    expect(body.needsReview).toBe(false);
    expect(body.record.site).toBe('Baneshwor');
  });

  it('serves the manager board with a summary and one row per person', async () => {
    const res = await fetch(`${base}/team`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.expected).toBe(8);
    expect(body.rows).toHaveLength(8);
    expect(body.rows.find((r) => r.id === 'u_prakash').exception).toBe('late_arrival');
    // The summary is the payload's own and counts the rows beside it (7.6).
    expect(body.summary.present).toBe(5);
    expect(
      body.summary.present + body.summary.late + body.summary.onLeave + body.summary.notIn,
    ).toBe(body.summary.expected);

    // One roster, many lists: every row is a roster person, named exactly the
    // way the directory and the presence strip name them (Section 7.6).
    for (const row of body.rows) {
      const person = ROSTER.find((entry) => entry.id === row.id);
      expect(person, row.id).toBeTruthy();
      expect(row.name, row.id).toBe(person.name);
      expect(row.initials, row.id).toBe(initialsOf(person.name));
      expect(row.site, row.id).toBe(person.site);
    }
  });

  it('422s a malformed team-board date', async () => {
    const res = await fetch(`${base}/team?date=09-10-2026`, { headers: auth });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('invalid_date');
  });

  it('serves the same fixture board for a well-formed team-board date', async () => {
    const res = await fetch(`${base}/team?date=2026-10-09`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(8);
  });

  it('lists a seeded request in the reviewer queue', async () => {
    const res = await fetch(`${base}/corrections?status=pending`, { headers: auth });
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({ id: 'corr_seed_1', status: 'in_review' });
    // the original punch travels with the request, so a reviewer sees both sides
    expect(body.rows[0].original.clockIn).toBe('09:38');
    expect(body.rows[0].proposed.clockIn).toBe('09:02');
  });

  it('scopes ?status=mine to the signed-in requester, not the whole org', async () => {
    const mine = await (await fetch(`${base}/corrections?status=mine`, { headers: auth })).json();
    expect(mine.rows).toHaveLength(1);
    // The requester is whoever the session says signed in — the staff demo
    // persona (Priya), not a name borrowed from another account.
    expect(mine.rows[0]).toMatchObject({ id: 'corr_seed_2', requester: 'Priya Sharma' });
    // the approved request carries the reviewer's note back to the requester
    expect(mine.rows[0].note).toBe('Checked against the site log.');

    const all = await (await fetch(`${base}/corrections`, { headers: auth })).json();
    expect(all.rows).toHaveLength(2);
  });

  it('rejects a correction without both times or a real reason', async () => {
    const headers = { ...auth, 'Content-Type': 'application/json' };
    const noTimes = await fetch(`${base}/corrections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ proposed: { clockIn: '09:00' }, reason: 'Missed punch' }),
    });
    expect(noTimes.status).toBe(422);
    expect((await noTimes.json()).code).toBe('invalid_correction');

    const weakReason = await fetch(`${base}/corrections`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        proposed: { clockIn: '09:00', clockOut: '17:00' },
        reason: 'bad',
      }),
    });
    expect(weakReason.status).toBe(422);
    expect((await weakReason.json()).code).toBe('reason_required');
  });

  it('accepts a correction and puts it in review', async () => {
    const res = await fetch(`${base}/corrections`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original: { id: 'punch_x', date: '2026-10-02', clockIn: null, clockOut: '17:00' },
        proposed: { clockIn: '09:00', clockOut: '17:00' },
        reason: 'Forgot to punch in at the office.',
      }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('in_review');
    expect(state.corrections).toHaveLength(3);
    // the server, not the client, decides who owns a new request
    expect(state.corrections.at(-1).requester).toBe('Priya Sharma');
  });

  it('requires a note for anything but an approval', async () => {
    const res = await fetch(`${base}/corrections/corr_seed_1/decision`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'reject' }),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('note_required');
  });

  it('approves a request and mirrors the server status', async () => {
    const res = await fetch(`${base}/corrections/corr_seed_1/decision`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).record.status).toBe('approved');
  });

  it('requesting information pins the reviewer question', async () => {
    const res = await fetch(`${base}/corrections/corr_seed_1/decision`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'request_info', note: 'Which site was this?' }),
    });
    const body = await res.json();
    expect(body.record.status).toBe('needs_info');
    expect(body.record.note).toBe('Which site was this?');
  });

  it('404s a decision on a request that does not exist', async () => {
    const res = await fetch(`${base}/corrections/nope/decision`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(res.status).toBe(404);
  });

  it('refuses a clock-out with no open session', async () => {
    const res = await fetch(`${base}/punch`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'out', idempotencyKey: 'k4', clientTs: '2026-10-09T11:30:00Z' }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('not_clocked_in');
  });
});
