// @ts-check

/**
 * Report/analytics/CSV contract checks (rows 21 and 28).
 *
 * Run: `npm test` / `npm run test:integration`.
 *
 * These tests target the seeded, isolated test database (DATABASE_URL →
 * postgresql://swams:swams@localhost:5432/swams_test) and force NODE_ENV=test
 * before any src module loads.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

// Must run before src/config/env.js (zod schema) is evaluated.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://swams:swams@localhost:5432/swams_test';

const { buildApp } = await import('../src/app.js');

const app = buildApp();
const api = request(app);

const LOGIN = (email) =>
  api
    .post('/api/v1/auth/login')
    .send({ email, password: 'password' })
    .set('Accept', 'application/json');

async function tokenFor(email) {
  const res = await LOGIN(email);
  assert.equal(res.status, 200, `login failed for ${email}`);
  return res.body.accessToken;
}

const HR = 'sarah@swams.com';

test('reports: missing type → 422 invalid_type', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/reports').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 422);
  assert.equal(res.body.code, 'invalid_type');
});

test('reports: type=attendance → 200 JSON rows', async () => {
  const token = await tokenFor(HR);
  const from = '2026-09-01';
  const to = '2026-10-17';
  const res = await api
    .get(`/api/v1/reports?type=attendance&from=${from}&to=${to}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.type, 'attendance');
  assert.ok(Array.isArray(res.body.rows));
  assert.equal(res.body.summary.present, 0, 'no sessions yet');
  assert.equal(res.body.summary.late, 0);
  assert.equal(res.body.summary.absent, 0);
  assert.equal(res.body.summary.onLeave, 0);
  assert.equal(res.body.summary.workedMinutes, 0);
  assert.ok(res.body.summary);
});

test('reports: type=leave → 200 JSON rows', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/reports?type=leave').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.rows));
  assert.ok(res.body.summary);
});

test('reports.csv: requires ?type= (422); type=attendance returns RFC-4180', async () => {
  const token = await tokenFor(HR);

  const bad = await api.get('/api/v1/reports/csv').set('Authorization', `Bearer ${token}`);
  assert.equal(bad.status, 422);

  const good = await api
    .get('/api/v1/reports/csv?type=attendance&from=2026-09-01&to=2026-10-17')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(good.status, 200);
  assert.match(good.header['content-type'], /text\/csv/);
  assert.match(good.text, /^employee,present,late,absent,onLeave,workedMinutes/);
});

test('reports/analytics: period=week → 200, 7 points', async () => {
  const token = await tokenFor(HR);
  const res = await api
    .get('/api/v1/reports/analytics?period=week')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.period, 'week');
  assert.equal(res.body.points.length, 7);
  assert.ok(res.body.summary);
  assert.ok(res.body.breakdown);
});

test('reports/analytics: invalid period → 422 invalid_period', async () => {
  const token = await tokenFor(HR);
  const res = await api
    .get('/api/v1/reports/analytics?period=quarter')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 422);
  assert.equal(res.body.code, 'invalid_period');
});
