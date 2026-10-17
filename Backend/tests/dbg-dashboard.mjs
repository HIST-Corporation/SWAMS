// @ts-check
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://swams:swams@localhost:5432/swams_test';

const { buildApp } = await import('../src/app.js');
const app = buildApp();
const api = request(app);

const r = await api
  .post('/api/v1/auth/login')
  .send({ email: 'sarah@swams.com', password: 'password' })
  .set('Accept', 'application/json');
console.log('login', r.status, r.body?.accessToken ? 'tok' : 'NO_TOK');
const token = r.body?.accessToken;
if (!token) process.exit(1);

const d = await api
  .get('/api/v1/reports?type=attendance&from=2026-09-01&to=2026-10-17')
  .set('Authorization', `Bearer ${token}`);
console.log('reports status', d.status);
console.log('reports body', JSON.stringify(d.body).slice(0, 300));
console.log('reports text', d.text.slice(0, 300));

const c = await api
  .get('/api/v1/reports/csv?type=attendance&from=2026-09-01&to=2026-10-17')
  .set('Authorization', `Bearer ${token}`);
console.log('csv status', c.status);
console.log('csv body', JSON.stringify(c.body).slice(0, 200));
console.log('csv text', c.text.slice(0, 200));
console.log('csv ct', c.header['content-type']);