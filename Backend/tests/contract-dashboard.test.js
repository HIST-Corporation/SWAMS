// @ts-check

/**
 * Scope/contract checks for the org dashboard (rows 12-15, 25, 26, 30).
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
const STAFF = 'priya@swams.com';
const TEAM_LEAD = 'anita@swams.com';
const MANAGER = 'ramesh@swams.com';

test('HR GET /api/v1/org/dashboard → 200, organization scope', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/org/dashboard').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'organization');
  assert.equal(typeof res.body.kpi.headcount, 'number');
  assert.ok(Array.isArray(res.body.trend.points), 'trend.points must be an array');
  assert.equal(res.body.trend.points.length, 8, '7 days + today');
  assert.ok(typeof res.body.kpi.rate === 'number' && res.body.kpi.rate >= 0);
  assert.ok(Array.isArray(res.body.departments));
  assert.ok(Array.isArray(res.body.benchmarks));
  assert.ok(Array.isArray(res.body.insights));
  assert.ok(Array.isArray(res.body.meetings));
});

test('staff GET /api/v1/org/dashboard → 403 out_of_scope', async () => {
  const token = await tokenFor(STAFF);
  const res = await api.get('/api/v1/org/dashboard').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'out_of_scope');
});

test('team_lead GET /api/v1/org/dashboard → 200, team scope', async () => {
  const token = await tokenFor(TEAM_LEAD);
  const res = await api.get('/api/v1/org/dashboard').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'team');
});

test('manager GET /api/v1/org/dashboard → 200, department scope', async () => {
  const token = await tokenFor(MANAGER);
  const res = await api.get('/api/v1/org/dashboard').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'department');
});

test('GET /api/v1/presence is scope-aware for HR and staff', async () => {
  for (const email of [HR, STAFF]) {
    const token = await tokenFor(email);
    const res = await api.get('/api/v1/presence').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200, email);
    assert.ok(Array.isArray(res.body.rows));
    assert.ok(res.body.rows.some((r) => r.id), 'must include a presence row');
  }
});

test('HR GET /api/v1/org/overview → 200', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/org/overview').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.headcount === 'number' && res.body.headcount >= 0);
  assert.ok(typeof res.body.onSite === 'number' && res.body.onSite >= 0);
});

test('staff GET /api/v1/staff/board → 403 not_a_staff_board', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/staff/board').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'not_a_staff_board');
});

test('staff GET /api/v1/staff/board → 200 own-queue shape', async () => {
  const token = await tokenFor(STAFF);
  const res = await api.get('/api/v1/staff/board').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.queue));
});
