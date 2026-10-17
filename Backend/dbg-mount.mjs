import request from 'supertest';
import { buildApp } from './src/app.js';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://swams:swams@localhost:5432/swams_test';

const app = buildApp();
const api = request(app);

async function tokenFor(email) {
  const r = await api.post('/api/v1/auth/login').send({ email, password: 'password' });
  if (r.status !== 200) {
    console.log('LOGIN FAILED', r.status, JSON.stringify(r.body).slice(0, 100));
    process.exit(1);
  }
  return r.body.accessToken;
}

(async () => {
  const t = await tokenFor('sarah@swams.com');
  const r = await api.get('/api/v1/org/dashboard').set('Authorization', `Bearer ${t}`);
  console.log('org/dashboard ->', r.status, JSON.stringify(r.body).slice(0, 120));
  const p = await api.get('/api/v1/presence').set('Authorization', `Bearer ${t}`);
  console.log('presence ->', p.status, JSON.stringify(p.body).slice(0, 80));
  process.exit(0);
})();
