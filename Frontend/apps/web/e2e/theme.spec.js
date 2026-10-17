import { test, expect } from '@playwright/test';

/**
 * Smoke tests (Section 14 E2E): sign in through the real login flow against
 * the mock backend, theme toggle persists across reload, the shell renders
 * with no console errors, and the notification bell opens.
 * Run: pnpm e2e
 */

/** Greeting variants for both locales and all times of day (WelcomeHero). */
const GREETING = /good (morning|afternoon|evening)|शुभ (बिहान|दिउँसो|साँझ)/i;

/**
 * A fresh browser has no mock session, so every test starts by signing in
 * exactly a user would (mock rule: any valid email + password ≥ 8 chars).
 * Lands on Home only after the greeting heading is visible.
 */
async function signIn(page, portal = 'staff') {
  // The root gate sends guests to /landing; /login is the direct door.
  await page.goto('/login');
  // Unauthenticated → /login carrying returnTo; sign in returns there.
  await page.getByLabel(/work email/i).fill('sita@himaldigital.com.np');
  await page.getByLabel(/^password/i).fill('correct-horse-1');
  // The role picker opens on Administration (the prototype's default), so the
  // staff path has to choose the Staff radio explicitly. Exact names: the
  // management portal also carries an "HR Manager" persona card, so a loose
  // /hr/i would match both the portal and the persona.
  await page
    .getByRole('radio', { name: portal === 'hr' ? 'Administration' : 'Staff', exact: true })
    .click();
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: GREETING })).toBeVisible();
}

test('theme toggle switches to dark and persists (Section 8.3)', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: /theme|थिम/i }).click();
  await page.getByRole('menuitemradio', { name: /dark|गाह्रो/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('shell renders the home screen with no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await signIn(page);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

  // The signed-out boot probes POST /auth/refresh (twice under StrictMode) and
  // the mock answers 401 by design — that is the session machine's "not signed
  // in yet" signal, not an application error. Everything else must be clean.
  const expectedBootProbe = /status of 401 \(Unauthorized\)/;
  expect(errors.filter((message) => !expectedBootProbe.test(message))).toEqual([]);
});

test('notification bell opens the panel with mark-all action (slice 6)', async ({ page }) => {
  await signIn(page);

  await page.getByRole('button', { name: /notifications/i }).click();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByRole('button', { name: /mark all as read/i })).toBeEnabled();
  // Unread rows are announced in words, not colour alone (§8.9).
  await expect(page.getByText('Unread').first()).toBeAttached();
});

test('HR opens settings and a theme choice saves (slice 6)', async ({ page }) => {
  await signIn(page, 'hr');

  // Desktop: sidebar Admin group. Mobile (360): bottom tab → More → Admin.
  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) {
    await page.getByRole('link', { name: 'More' }).click();
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole('link', { name: 'Settings', exact: true }).first()).toBeVisible();
  }
  await page.getByRole('link', { name: 'Settings', exact: true }).first().click();

  // Level 1: the matrix also renders an h3 for the settings permission area.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Settings', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Dark' }).check();
  await expect(page.getByRole('status')).toHaveText('Preference saved.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Roles matrix: read-only reference over the canonical bundles.
  await expect(page.getByRole('heading', { name: 'Roles and permissions' })).toBeVisible();
  const matrix = page.getByRole('table').first();
  await expect(matrix.getByRole('columnheader', { name: 'HR' })).toBeVisible();
  // Each permission row appears in exactly one area table — search page-wide.
  await expect(page.getByRole('rowheader', { name: 'Manage workspace settings' })).toBeVisible();
});

test('staff cannot reach settings — hidden from nav and denied on direct visit', async ({
  page,
}) => {
  await signIn(page);

  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);

  // Direct visit: the guard renders the designed denial page, never blank.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /don't have access/i })).toBeVisible();
});

test('HR audits activity with filters and pagination (slice 6)', async ({ page }) => {
  await signIn(page, 'hr');

  // Desktop: sidebar Admin group. Mobile (360): bottom tab → More → Admin.
  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) await page.getByRole('link', { name: 'More' }).click();
  await page.getByRole('link', { name: 'Audit log', exact: true }).first().click();

  await expect(page.getByRole('heading', { name: 'Audit log', exact: true })).toBeVisible();
  await expect(page.getByText('Sita Shrestha').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();

  // The filter narrows to the one invitation — pagination collapses with it.
  // (`listitem` scopes to the rows: the filter <option> carries the same text.)
  await page.getByLabel(/action/i).selectOption('userInvited');
  const items = page.getByRole('listitem');
  await expect(items.getByText('Invited a new team member.')).toBeVisible();
  await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();

  // Clearing the filter restores the full set; page two exists server-side.
  await page.getByLabel(/action/i).selectOption('');
  await page.getByRole('button', { name: /next/i }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
});

test('staff cannot reach the audit log — hidden from nav and denied on direct visit', async ({
  page,
}) => {
  await signIn(page);

  await expect(page.getByRole('link', { name: 'Audit log', exact: true })).toHaveCount(0);

  await page.goto('/audit');
  await expect(page.getByRole('heading', { name: /don't have access/i })).toBeVisible();
});

test('HR opens reports and exports the CSV (slice 7)', async ({ page }) => {
  await signIn(page, 'hr');

  // Desktop: sidebar Insights group. Mobile (360): bottom tab → More → Insights.
  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) await page.getByRole('link', { name: 'More' }).click();
  await page.getByRole('link', { name: 'Reports', exact: true }).first().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Reports', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Present' })).toBeVisible();

  // The CSV is rendered by the server (mock) and saved by the browser.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export csv/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^swams-attendance-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/,
  );
});

test('HR opens the team attendance board from the Attendance page (slice 4)', async ({ page }) => {
  await signIn(page, 'hr');

  // Attendance is a sidebar link on desktop and a bottom tab on mobile.
  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) await page.getByRole('link', { name: 'Attendance' }).click();
  else await page.getByRole('link', { name: 'Attendance', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Attendance' })).toBeVisible();

  // The team-board link renders for reviewers only — it sits in the page header.
  await page.getByRole('link', { name: 'Team attendance' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Team attendance' })).toBeVisible();

  // Server numbers first, then the board, then the exceptions band. The name
  // legitimately appears twice (board row + attention band), so take the first.
  // The presence line states the team total; the "in" count is fixture data, so
  // only the total is pinned here.
  await expect(page.getByText(/\d+ of 8 in today/)).toBeVisible();
  await expect(page.getByText('Prakash Gurung').first()).toBeVisible();
  await expect(page.getByText('Late arrival')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review correction requests' })).toBeVisible();
});

test('staff cannot reach the team board — no link and denied on direct visit', async ({ page }) => {
  await signIn(page);

  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) await page.getByRole('link', { name: 'Attendance' }).click();
  else await page.getByRole('link', { name: 'Attendance', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Attendance' })).toBeVisible();

  await expect(page.getByRole('link', { name: 'Team attendance' })).toHaveCount(0);

  // Direct visit: the guard renders the designed denial page, never blank.
  await page.goto('/attendance/team');
  await expect(page.getByRole('heading', { name: /don't have access/i })).toBeVisible();
});

test('staff moves a task with the keyboard and creates one (slice 8)', async ({ page }) => {
  await signIn(page);

  // Task board is a sidebar link on desktop and a bottom tab on mobile.
  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) await page.getByRole('link', { name: 'Task board' }).click();
  else await page.getByRole('link', { name: 'Task board', exact: true }).first().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Task board' })).toBeVisible();
  // The lane heading reads "To do" with its count beside it.
  await expect(page.getByRole('heading', { name: /^To do/ })).toBeVisible();

  // Hierarchy scope: this staff session only sees work referred to it, so
  // Anita's seeded card is not on Priya's board at all.
  await expect(page.getByText(/only the work referred to you/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Prepare the monthly payroll export', exact: true }),
  ).toHaveCount(0);

  // The prototype's card actions and revision trail are on the board.
  await expect(page.getByRole('button', { name: /^start$/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revision history trail' })).toBeVisible();

  // Keyboard path (§7.6): Space lifts, ArrowRight aims, Space drops.
  // "Wire the offline punch queue states" seeds this persona's To do lane.
  // The keyboard path lives on the card's grip (the title button only opens the
  // detail panel): its label is "Move <title>: Space to lift, arrow keys …".
  const grip = page.getByRole('button', { name: /^Move Wire the offline punch queue states/ });
  await grip.focus();
  await page.keyboard.press(' ');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(' ');
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    'Moved Wire the offline punch queue states to In progress.',
  );

  // Inline create: server-confirmed card lands in To do with a status line.
  await page.getByRole('button', { name: /new task/i }).click();
  await page.getByLabel('Title', { exact: true }).fill('Book the training room');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('status')).toHaveText('Task added to To do.');
  // `exact`, because the new card's grip carries the title in its own label too.
  await expect(
    page.getByRole('button', { name: 'Book the training room', exact: true }),
  ).toBeAttached();
});

test('HR home composes the company board and exports it (design parity)', async ({ page }) => {
  await signIn(page, 'hr');

  // Every panel of the prototype's `#page-dashboard`, in one screen.
  for (const name of [
    'Attendance trend',
    'Department attendance',
    'Workforce overview',
    'Insights',
    "Today's meetings",
    'Industry benchmark',
  ]) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }

  // One payload owns the tiles and the donut: 127 present = 124 in + 3 late,
  // against 142 headcount — so the two can never state different numbers.
  await expect(page.getByText('127')).toBeVisible();
  await expect(page.getByText('142').first()).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Attendance rate' })).toBeVisible();

  // The sample-data notice names its scope before anyone can read the fixtures
  // as production figures (§12.1).
  await expect(page.getByText('Sample company figures')).toBeVisible();

  // Export writes a real file of the figures on screen (Section 9.6: no button
  // that pretends to download).
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^swams-dashboard-\d{4}-\d{2}-\d{2}\.csv$/);

  const stream = await file.createReadStream();
  const csv = await new Promise((resolve, reject) => {
    let text = '';
    stream.on('data', (chunk) => {
      text += chunk;
    });
    stream.on('end', () => resolve(text));
    stream.on('error', reject);
  });
  expect(csv).toContain('Present today,127');
  expect(csv).toContain('Engineering,96%');
});

test('staff home stays personal — no company panels or export', async ({ page }) => {
  await signIn(page);

  // The staff board keeps the worker's own week chart...
  await expect(page.getByRole('heading', { name: 'Hours this week' })).toBeVisible();

  // ...and none of the org analytics, which have no endpoint for them.
  await expect(page.getByRole('heading', { name: 'Attendance trend' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Industry benchmark' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export' })).toHaveCount(0);
  await expect(page.getByText('Sample company figures')).toHaveCount(0);
});

test('staff browses the calendar month and selects a day (slice 8)', async ({ page }) => {
  await signIn(page);

  // Calendar sits in the sidebar People group on desktop; via More on mobile.
  const isMobile = (page.viewportSize()?.width ?? 1024) < 768;
  if (isMobile) {
    await page.getByRole('link', { name: 'More' }).click();
    await expect(page.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Calendar', exact: true }).first().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible();
  // Weekday headers + the legend are words, never colour-only swatches. Both
  // queries are scoped: "Holiday" is also a badge on the agenda's holiday row,
  // and day 15 is also a button in the agenda.
  const grid = page.getByRole('grid', { name: 'Calendar' });
  await expect(page.getByText('Sun')).toBeVisible();
  await expect(
    page.getByLabel('Legend').getByRole('button', { name: 'Holiday', exact: true }),
  ).toBeVisible();

  // Selecting the 15th renders its events in words in the detail panel.
  await grid.getByRole('button', { name: /^15 / }).click();
  await expect(
    page.getByRole('region', { name: /events on/i }).getByText('Dashain holiday'),
  ).toBeVisible();

  // Month navigation announces the new month and refetches without error.
  const monthTitle = page.locator('h2').first();
  const before = await monthTitle.textContent();
  await page.getByRole('button', { name: /next month/i }).click();
  await expect(monthTitle).not.toHaveText(before);
  await expect(page.locator('[aria-live="polite"]')).not.toHaveText(before);
});
