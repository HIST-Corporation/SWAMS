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
const OWNER = 'aarav@swams.com';

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

/**
 * Role dashboards (rows: role dashboards) — each admin role composes its own
 * board, so the shapes are locked here as the client panels read them.
 */
test('HR GET /api/v1/dashboard/hr → 200, action-queue shape', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/dashboard/hr').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'organization');
  assert.ok(Array.isArray(res.body.actionQueue.pendingLeave));
  assert.ok(Array.isArray(res.body.actionQueue.pendingCorrections));
  assert.ok(Array.isArray(res.body.presence.onLeaveToday));
});

test('manager GET /api/v1/dashboard/manager → 200, department shape', async () => {
  const token = await tokenFor(MANAGER);
  const res = await api.get('/api/v1/dashboard/manager').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'department');
  assert.equal(typeof res.body.department.headcount, 'number');
  assert.equal(typeof res.body.department.rate, 'number');
  assert.ok(Array.isArray(res.body.approvals.pendingLeave));
  assert.ok(Array.isArray(res.body.approvals.pendingCorrections));
});

test('team_lead GET /api/v1/dashboard/team-lead → 200, team shape', async () => {
  const token = await tokenFor(TEAM_LEAD);
  const res = await api.get('/api/v1/dashboard/team-lead').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'team');
  assert.equal(typeof res.body.team.headcount, 'number');
  assert.ok(Array.isArray(res.body.workload));
  assert.ok(Array.isArray(res.body.blockers));
});

test('owner GET /api/v1/dashboard/owner → 200, org shape with departments', async () => {
  const token = await tokenFor(OWNER);
  const res = await api.get('/api/v1/dashboard/owner').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.scope, 'organization');
  assert.equal(typeof res.body.org.headcount, 'number');
  assert.equal(typeof res.body.org.rate, 'number');
  assert.ok(Array.isArray(res.body.departments));
  assert.equal(typeof res.body.approvals.pendingLeave, 'number');
  assert.equal(typeof res.body.approvals.pendingCorrections, 'number');
});

test('role dashboards are role-gated → 403 for the wrong role', async () => {
  const hrToken = await tokenFor(HR);
  const staffToken = await tokenFor(STAFF);
  const paths = [
    '/api/v1/dashboard/hr',
    '/api/v1/dashboard/manager',
    '/api/v1/dashboard/team-lead',
    '/api/v1/dashboard/owner',
  ];
  for (const path of paths) {
    const res = await api.get(path).set('Authorization', `Bearer ${staffToken}`);
    assert.equal(res.status, 403, `staff must not read ${path}`);
    assert.equal(res.body.code, 'forbidden', path);
  }
  const res = await api.get('/api/v1/dashboard/owner').set('Authorization', `Bearer ${hrToken}`);
  assert.equal(res.status, 403, 'HR must not read the owner board');
});
