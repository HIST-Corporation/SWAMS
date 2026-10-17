import { buildApp } from './src/app.js';
const app = buildApp();
const stack = [];
for (const m of app._router.stack) {
  if (m.handle && m.handle.stack) {
    for (const line of m.handle.stack.split('\n')) {
      if (/auth|login/i.test(line)) stack.push(line.trim());
    }
  }
}
console.log(stack.join('\n'));
