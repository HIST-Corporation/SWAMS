import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { reportHandlers } from './handlers.js';
import { setAuth } from '../../auth/mocks/authState.js';
import { deriveReport, REPORT_COLUMNS } from './fixtures.js';

/**
 * Contract coverage for the reports mock (mock-first development, §5). These
 * assertions describe the shape the real API must provide (contract request
 * 21) — if the mock drifts from the contract, this test fails.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...reportHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'hr' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';
const range = 'from=2026-09-01&to=2026-09-30';

describe('reports mock contract', () => {
  it('rejects an unauthenticated request with the AppError shape', async () => {
    const res = await fetch(`${base}/reports?type=attendance`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('422s an unknown report type without inventing a report', async () => {
    const res = await fetch(`${base}/reports?type=payroll&${range}`, { headers: auth });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'invalid_type' });
  });

  it('422s malformed dates and inverted ranges', async () => {
    const malformed = await fetch(`${base}/reports?type=attendance&from=30/09/2026&to=2026-09-30`, {
      headers: auth,
    });
    expect(malformed.status).toBe(422);
    expect(await malformed.json()).toMatchObject({ code: 'invalid_date' });

    const inverted = await fetch(`${base}/reports?type=attendance&from=2026-09-30&to=2026-09-01`, {
      headers: auth,
    });
    expect(inverted.status).toBe(422);
    expect(await inverted.json()).toMatchObject({ code: 'invalid_range' });
  });

  it('serves rows whose summary reconciles (the UI shows totals verbatim)', async () => {
    const res = await fetch(`${base}/reports?type=attendance&${range}`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ type: 'attendance', from: '2026-09-01', to: '2026-09-30' });
    expect(body.rows.length).toBeGreaterThan(0);
    for (const row of body.rows) {
      expect(Object.keys(row)).toEqual(REPORT_COLUMNS.attendance);
    }
    // The summary is the column sum — the UI never recomputes it.
    const sum = body.rows.reduce((acc, row) => acc + row.present, 0);
    expect(body.summary.present).toBe(sum);
    expect(body.summary.headcount).toBe(body.rows.length);
  });

  it('derives longer ranges to at least the counts of shorter ones (deterministic)', async () => {
    const short = await (
      await fetch(`${base}/reports?type=attendance&from=2026-09-01&to=2026-09-07`, {
        headers: auth,
      })
    ).json();
    const long = await (
      await fetch(`${base}/reports?type=attendance&from=2026-09-01&to=2026-09-30`, {
        headers: auth,
      })
    ).json();
    expect(long.summary.present).toBeGreaterThanOrEqual(short.summary.present);
  });

  it('serves CSV whose header matches the columns and whose rows match the JSON', async () => {
    const res = await fetch(`${base}/reports.csv?type=leave&${range}`, { headers: auth });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain(
      'swams-leave-2026-09-01_2026-09-30.csv',
    );

    const lines = (await res.text()).trim().split('\r\n');
    expect(lines[0]).toBe(REPORT_COLUMNS.leave.join(','));

    const json = await (
      await fetch(`${base}/reports?type=leave&${range}`, { headers: auth })
    ).json();
    expect(lines.length).toBe(json.rows.length + 1);
    // The CSV body is the same derivation as the table — every employee appears.
    for (const row of json.rows) expect(lines.join('\n')).toContain(row.employee);
    expect(deriveReport('leave', '2026-09-01', '2026-09-30').rows).toEqual(json.rows);
  });
});
