// @ts-check

/**
 * Notifications, audit, task board, attendance team board and platform
 * routes contract checks (rows 17-19, 20, 22, 24, 29, 31).
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

test('notifications: GET returns only whitelisted keys (no audience leak)', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/notifications').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.rows));
  for (const row of res.body.rows) {
    assert.ok(!Object.prototype.hasOwnProperty.call(row, 'audience'), 'audience must not leak');
  }
});

test('notifications: POST callRequested → 201', async () => {
  const token = await tokenFor(HR);
  const res = await api
    .post('/api/v1/notifications')
    .set('Authorization', `Bearer ${token}`)
    .send({ key: 'callRequested', params: { x: 1 } });
  assert.equal(res.status, 201);
  assert.equal(res.body.record.key, 'callRequested');
  assert.equal(res.body.record.audience, undefined, 'audience must not leak');
});

test('notifications: POST unknown key → 422', async () => {
  const token = await tokenFor(HR);
  const res = await api
    .post('/api/v1/notifications')
    .set('Authorization', `Bearer ${token}`)
    .send({ key: 'admin.announcement' });
  assert.equal(res.status, 422);
  assert.equal(res.body.code, 'invalid_notification');
});

test('audit: staff cannot read audit logs (audit.read required) → 403', async () => {
  const token = await tokenFor(STAFF);
  const res = await api.get('/api/v1/audit').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'forbidden');
});

test('audit: HR GET /api/v1/audit returns rows + totals', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/audit').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.rows === 'number' || Array.isArray(res.body.rows));
  assert.equal(typeof res.body.total, 'number');
  assert.ok(res.body.totalPages >= 1);
});

test('tasks: HR GET /api/v1/tasks → 200 board shape', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/tasks').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.rows));
  assert.ok(Array.isArray(res.body.completed));
  assert.ok(Array.isArray(res.body.lanes));
  assert.ok(Array.isArray(res.body.revisions));
  assert.equal(typeof res.body.canManage, 'boolean');
});

test('attendance/team: HR → 200 team board', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/attendance/team').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.summary || res.body.rows);
});

test('attendance/team: staff → 403 out_of_scope', async () => {
  const token = await tokenFor(STAFF);
  const res = await api.get('/api/v1/attendance/team').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'out_of_scope');
});

test('platform console rejects a workforce token (realm mismatch) → 401', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/api/v1/platform/unknown').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'unauthorized');
});

test('platform console: unknown platform route → 404', async () => {
  // The console is a separate auth realm: log in as a console admin (seed
  // pa_1 / admin@swams.com, level 'owner'), then any unknown route falls
  // through to the console's 404 handler.
  const res = await api
    .post('/api/v1/platform/auth/login')
    .send({ email: 'admin@swams.com', password: 'password' })
    .set('Accept', 'application/json');
  assert.equal(res.status, 200, 'console login failed');
  const token = res.body.accessToken;
  const res2 = await api.get('/api/v1/platform/unknown').set('Authorization', `Bearer ${token}`);
  assert.equal(res2.status, 404);
  assert.equal(res2.body.code, 'not_found');
});

test('root API returns 404 (no unversioned root route)', async () => {
  const token = await tokenFor(HR);
  const res = await api.get('/').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 404);
});
