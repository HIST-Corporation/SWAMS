// TEMP diagnostic — sign in, open /messages, capture composer state.
import { chromium } from '@playwright/test';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Sign in through the real mock flow (any valid email + password >= 8 chars).
  await page.goto('http://localhost:5173/login');
  await page.getByLabel(/work email/i).fill('sita@himaldigital.com.np');
  await page.getByLabel(/^password/i).fill('correct-horse-1');
  await page.getByRole('radio', { name: 'Staff', exact: true }).click();
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(1200);

  await page.goto('http://localhost:5173/messages', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const url = page.url();
  const composer = await page.evaluate(() => {
    const c = [...document.querySelectorAll('input')].find((e) =>
      (e.placeholder || '').includes('Type a message'),
    );
    if (!c) return { found: false };
    const r = c.getBoundingClientRect();
    const pane = c.closest('div.flex.min-w-0.flex-col');
    const pr = pane ? pane.getBoundingClientRect() : null;
    return {
      found: true,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      vh: window.innerHeight,
      paneTop: pr ? Math.round(pr.top) : null,
      paneBottom: pr ? Math.round(pr.bottom) : null,
    };
  });

  console.log('URL:', url);
  console.log('COMPOSER:', JSON.stringify(composer, null, 2));
  await page.screenshot({ path: '/tmp/messages.png', fullPage: true });
  await browser.close();
};

run().catch((e) => {
  console.error('SCRIPT FAIL:', e.message);
  process.exit(1);
});



