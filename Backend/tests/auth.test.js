// @ts-check

/**
 * AuthN + authZ surface (contract rows 4-8, 16, 31, 33).
 *
 * Run: `npm test` (or `npm run test:integration`).
 *
 * These tests target the seeded, isolated test database (DATABASE_URL →
 * postgresql://swams:swams@localhost:5432/swams_test) and force NODE_ENV=test
 * and the test DATABASE_URL before any src module loads (env.js is a
 * process-wide singleton).
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

const LOGIN = (email, password = 'password') =>
  api
    .post('/api/v1/auth/login')
    .send({ email, password })
    .set('Accept', 'application/json');

test('GET /health is a public liveness probe (no token required)', async () => {
  const res = await api.get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.db, 'up');
  assert.ok(res.body.uptimeSeconds >= 0);
});

test('POST /api/v1/auth/login accepts the seeded HR demo account', async () => {
  const res = await LOGIN('sarah@swams.com');
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken, 'accessToken must be returned');
  assert.ok(res.body.session, 'session must be returned');
});

test('POST /api/v1/auth/login rejects unknown credentials', async () => {
  const res = await LOGIN('sarah@swams.com', 'wrong-password');
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'unauthorized');
});

test('POST /api/v1/auth/login rejects missing credentials', async () => {
  const res = await api.post('/api/v1/auth/login').send({ email: '' });
  assert.equal(res.status, 400);
});

test('POST /api/v1/auth/login rejects missing password', async () => {
  const res = await api.post('/api/v1/auth/login').send({ email: 'sarah@swams.com' });
  assert.equal(res.status, 400);
});

test('protected route requires a valid token (401)', async () => {
  const res = await api.get('/api/v1/org/dashboard');
  assert.equal(res.status, 401);
});

test('POST /api/v1/auth/logout succeeds (204)', async () => {
  await LOGIN('sarah@swams.com');
  const res = await api.post('/api/v1/auth/logout').send({});
  assert.equal(res.status, 204);
});

test('refresh without token → 401', async () => {
  const res = await api.post('/api/v1/auth/refresh').send({});
  assert.equal(res.status, 401);
});
