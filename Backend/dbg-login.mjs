import request from 'supertest';
import { buildApp } from './src/app.js';

const app = buildApp();
(async () => {
  const r = await request(app).post('/api/v1/auth/login').send({ email: 'sarah@swams.com', password: 'password' });
  console.log('status:', r.status);
  console.log('body:', JSON.stringify(r.body).slice(0, 120));
  process.exit(0);
})();
