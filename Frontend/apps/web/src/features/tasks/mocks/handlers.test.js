import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { taskHandlers, resetTaskStore } from './handlers.js';
import { resetAuthState, setAuth } from '../../auth/mocks/authState.js';

/**
 * Contract coverage for the tasks mock (mock-first development, §5). These
 * assertions describe the shape the real API must provide (contract requests
 * 11 and 22) — if the mock drifts from the contract, this test fails.
 */
// `msw/node` has no `location`; give node an origin for relative matching.
globalThis.location = new URL('http://localhost/');

const server = setupServer(...taskHandlers);

beforeAll(() => {
  setAuth({ token: 'tok_test', sessionKey: 'hr' });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  resetTaskStore();
  resetAuthState();
  setAuth({ token: 'tok_test', sessionKey: 'hr' });
});
afterAll(() => server.close());

const auth = { Authorization: 'Bearer tok_test' };
/** msw/node needs absolute URLs; the browser worker matches any origin. */
const base = 'http://localhost/api/v1';

const post = (path, body, headers = auth) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const patch = (path, body, headers = auth) =>
  fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const del = (path, headers = auth) => fetch(`${base}${path}`, { method: 'DELETE', headers });

const get = (path, headers = auth) => fetch(`${base}${path}`, { method: 'GET', headers });

const FIVE = ['todo', 'in_progress', 'review', 'revision', 'done'].map((id) => ({
  id,
  name: null,
  wipLimit: null,
}));

describe('tasks mock contract', () => {
  it('rejects an unauthenticated board read with the AppError shape', async () => {
    const res = await fetch(`${base}/tasks`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthenticated' });
    expect(body.requestId).toBeTruthy();
  });

  it('serves the compact due-today rows Home renders', async () => {
    const res = await fetch(`${base}/tasks?due=today`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows.length).toBeGreaterThan(0);
    for (const row of body.rows) {
      expect(Object.keys(row).sort()).toEqual(['due', 'id', 'status', 'title']);
      expect(['todo', 'in_progress', 'done']).toContain(row.status);
    }
  });

  it('serves the full board rows from the same store (no drift between views)', async () => {
    const res = await fetch(`${base}/tasks`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows.length).toBeGreaterThan(0);
    for (const row of body.rows) {
      expect(row).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        lane: expect.any(String),
        priority: expect.any(String),
      });
    }
    const compact = await (await fetch(`${base}/tasks?due=today`, { headers: auth })).json();
    const compactIds = new Set(compact.rows.map((row) => row.id));
    const boardDueToday = body.rows
      .filter((row) => row.due === null || typeof row.due === 'string')
      .map((row) => row.id);
    // Every compact id exists in the board set exactly once.
    for (const id of compactIds) {
      expect(boardDueToday.filter((candidate) => candidate === id)).toHaveLength(1);
    }
  });

  it('moves a lane and returns the updated record', async () => {
    const res = await patch('/tasks/tsk_02', { lane: 'in_progress' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.record).toMatchObject({ id: 'tsk_02', lane: 'in_progress' });

    const board = await (await fetch(`${base}/tasks`, { headers: auth })).json();
    expect(board.rows.find((row) => row.id === 'tsk_02').lane).toBe('in_progress');
  });

  it('requires a reviewer for Review and a note for Revision', async () => {
    // tsk_02 has no reviewer — Review must fail before the record touches.
    const review = await patch('/tasks/tsk_02', { lane: 'review' });
    expect(review.status).toBe(422);
    expect(await review.json()).toMatchObject({ code: 'reviewer_required' });

    const noNote = await patch('/tasks/tsk_02', { lane: 'revision' });
    expect(noNote.status).toBe(422);
    expect(await noNote.json()).toMatchObject({ code: 'note_required' });

    const blank = await patch('/tasks/tsk_02', { lane: 'revision', note: '   ' });
    expect(blank.status).toBe(422);

    const withNote = await patch('/tasks/tsk_02', { lane: 'revision', note: 'Needs a signature.' });
    expect(withNote.status).toBe(200);
    const body = await withNote.json();
    expect(body.record).toMatchObject({ lane: 'revision', note: 'Needs a signature.' });
  });

  it('404s unknown tasks and 422s unknown lanes without touching the store', async () => {
    const missing = await patch('/tasks/tsk_nope', { lane: 'done' });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ code: 'not_found' });

    const lane = await patch('/tasks/tsk_02', { lane: 'limbo' });
    expect(lane.status).toBe(422);
    expect(await lane.json()).toMatchObject({ code: 'invalid_lane' });
  });

  it('creates a task in To do with validation', async () => {
    const titleless = await post('/tasks', { title: '   ' });
    expect(titleless.status).toBe(422);
    expect(await titleless.json()).toMatchObject({ code: 'title_required' });

    const badDue = await post('/tasks', { title: 'Anything', due: 'next Friday' });
    expect(badDue.status).toBe(422);
    expect(await badDue.json()).toMatchObject({ code: 'invalid_due' });

    const created = await post('/tasks', { title: 'Book the training room' });
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.record).toMatchObject({ title: 'Book the training room', lane: 'todo' });
    expect(body.record.checklist).toEqual([]);
  });

  it("edits a task's own fields and leaves everything else alone", async () => {
    const res = await patch('/tasks/tsk_01', {
      title: 'Payroll export for October',
      description: 'Updated scope.',
      priority: 'low',
      due: null,
      assigneeId: null,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.record).toMatchObject({
      id: 'tsk_01',
      title: 'Payroll export for October',
      description: 'Updated scope.',
      priority: 'low',
      due: null,
      assignee: null,
      lane: 'todo',
    });
    // The untouched checklist survives the edit.
    expect(body.record.checklist.length).toBeGreaterThan(0);
  });

  it('refuses a patch that names nothing, or names something invalid', async () => {
    const nothing = await patch('/tasks/tsk_01', { nonsense: true });
    expect(nothing.status).toBe(422);
    expect(await nothing.json()).toMatchObject({ code: 'invalid_patch' });

    const blank = await patch('/tasks/tsk_01', { title: '   ' });
    expect(blank.status).toBe(422);
    expect(await blank.json()).toMatchObject({ code: 'title_required' });

    const priority = await patch('/tasks/tsk_01', { priority: 'urgent' });
    expect(priority.status).toBe(422);
    expect(await priority.json()).toMatchObject({ code: 'invalid_priority' });

    const person = await patch('/tasks/tsk_01', { assigneeId: 'u_nobody' });
    expect(person.status).toBe(422);
    expect(await person.json()).toMatchObject({ code: 'unknown_assignee' });
  });

  it('accepts a reviewer and the Review lane in one patch', async () => {
    const res = await patch('/tasks/tsk_02', { lane: 'review', reviewerId: 'u_ramesh' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.record).toMatchObject({ lane: 'review', reviewer: { id: 'u_ramesh' } });
  });

  it('adds, ticks and removes checklist items (contract request 22)', async () => {
    const added = await post('/tasks/tsk_04/checklist', { text: 'Ask Finance for the ledger' });
    expect(added.status).toBe(201);
    const item = (await added.json()).record.checklist.at(-1);
    expect(item).toMatchObject({ text: 'Ask Finance for the ledger', done: false });

    const blank = await post('/tasks/tsk_04/checklist', { text: '   ' });
    expect(blank.status).toBe(422);
    expect(await blank.json()).toMatchObject({ code: 'text_required' });

    const missing = await post('/tasks/tsk_nope/checklist', { text: 'Anything' });
    expect(missing.status).toBe(404);

    const toggled = await patch(`/tasks/tsk_04/checklist/${item.id}`, { done: true });
    expect(toggled.status).toBe(200);
    const toggledRecord = (await toggled.json()).record;
    expect(toggledRecord.checklist.find((row) => row.id === item.id).done).toBe(true);

    const nonBoolean = await patch(`/tasks/tsk_04/checklist/${item.id}`, { done: 'yes' });
    expect(nonBoolean.status).toBe(422);
    expect(await nonBoolean.json()).toMatchObject({ code: 'invalid_done' });

    const removed = await del(`/tasks/tsk_04/checklist/${item.id}`);
    expect(removed.status).toBe(200);
    expect((await removed.json()).record.checklist).toEqual([]);

    const again = await del(`/tasks/tsk_04/checklist/${item.id}`);
    expect(again.status).toBe(404);
    expect(await again.json()).toMatchObject({ code: 'item_not_found' });
  });

  it('will not move a card into Review even when the patch also names a reviewer it does not know', async () => {
    const res = await patch('/tasks/tsk_02', { lane: 'review', reviewerId: 'u_nobody' });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'unknown_reviewer' });

    const board = await (await fetch(`${base}/tasks`, { headers: auth })).json();
    expect(board.rows.find((row) => row.id === 'tsk_02').lane).toBe('todo');
  });
});

/**
 * The board's hierarchy scope (contract request 11): the SESSION decides what
 * a session sees and moves — staff see and move only work referred to them,
 * managers/HR see everything.
 */
describe('tasks board hierarchy scope', () => {
  it('gives a staff session only the work referred to it', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const res = await fetch(`${base}/tasks`, { headers: auth });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scope).toBe('self');
    expect(body.canManage).toBe(false);
    expect(body.rows.length).toBeGreaterThan(0);
    // Priya's own cards plus the two reviews referred to her — nothing else.
    for (const row of body.rows) {
      expect(['tsk_10', 'tsk_13', 'tsk_14', 'tsk_15', 'tsk_16']).toContain(row.id);
    }
    // The column config and the trail ride along in every board read.
    expect(body.lanes.map((lane) => lane.id)).toEqual([
      'todo',
      'in_progress',
      'review',
      'revision',
      'done',
    ]);
    expect(body.revisions.length).toBeGreaterThan(0);
  });

  it('refuses a staff session that asks for the whole board, or a bogus scope', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const all = await fetch(`${base}/tasks?scope=all`, { headers: auth });
    expect(all.status).toBe(403);
    expect(await all.json()).toMatchObject({ code: 'scope_denied' });

    const bogus = await fetch(`${base}/tasks?scope=team`, { headers: auth });
    expect(bogus.status).toBe(422);
    expect(await bogus.json()).toMatchObject({ code: 'invalid_scope' });
  });

  it('lets staff move only their own work', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const denied = await patch('/tasks/tsk_01', { lane: 'in_progress' });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: 'not_your_task' });

    const allowed = await patch('/tasks/tsk_14', { lane: 'in_progress' });
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).record).toMatchObject({ lane: 'in_progress' });
  });

  it('reads the whole board as HR, with the manager controls', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const body = await (await fetch(`${base}/tasks`, { headers: auth })).json();
    expect(body.scope).toBe('all');
    expect(body.canManage).toBe(true);
    expect(body.rows.length).toBeGreaterThan(5);
  });

  it('assigns an unnamed task to the person who raised it', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const staffCreate = await post('/tasks', { title: 'Fix the sign-in link' });
    expect(staffCreate.status).toBe(201);
    expect((await staffCreate.json()).record.assignee).toMatchObject({ id: 'u_priya' });

    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const hrCreate = await post('/tasks', { title: 'Book the venue' });
    expect((await hrCreate.json()).record.assignee).toMatchObject({ id: 'u_sarah' });
  });
});

/** Board columns ("slots"): manager-only config, WIP limits, custom lanes. */
describe('board columns', () => {
  it('refuses column changes to a staff session', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const res = await post('/tasks/lanes', { name: 'Client review' });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'not_allowed' });
  });

  it('adds, renames and WIP-limits a column as HR — and cards can move into it', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const created = await post('/tasks/lanes', { name: 'Client review', wipLimit: 2 });
    expect(created.status).toBe(201);
    const lane = (await created.json()).record;
    expect(lane).toMatchObject({ name: 'Client review', wipLimit: 2 });

    const board = await (await fetch(`${base}/tasks`, { headers: auth })).json();
    expect(board.lanes.at(-1)).toMatchObject({ id: lane.id, name: 'Client review' });

    const renamed = await patch(`/tasks/lanes/${lane.id}`, { name: 'Client QA', wipLimit: 3 });
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).record).toMatchObject({ name: 'Client QA', wipLimit: 3 });

    const moved = await patch('/tasks/tsk_01', { lane: lane.id });
    expect(moved.status).toBe(200);
    expect((await moved.json()).record).toMatchObject({ lane: lane.id });

    // Every refusal the dialog shows verbatim.
    const duplicate = await post('/tasks/lanes', { name: 'client qa' });
    expect(duplicate.status).toBe(422);
    expect(await duplicate.json()).toMatchObject({ code: 'lane_exists' });

    const blank = await post('/tasks/lanes', { name: '   ' });
    expect(blank.status).toBe(422);
    expect(await blank.json()).toMatchObject({ code: 'invalid_name' });

    const badWip = await post('/tasks/lanes', { name: 'Ops', wipLimit: 0 });
    expect(badWip.status).toBe(422);
    expect(await badWip.json()).toMatchObject({ code: 'invalid_wip' });

    const nothing = await patch(`/tasks/lanes/${lane.id}`, {});
    expect(nothing.status).toBe(422);
    expect(await nothing.json()).toMatchObject({ code: 'invalid_patch' });

    const missing = await patch('/tasks/lanes/col_nope', { name: 'Gone' });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ code: 'lane_not_found' });
  });
});

/** The push back → revision history trail (the prototype's trail table). */
describe('revision trail', () => {
  it('appends a row when a card is pushed back, with the full detail', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const res = await patch('/tasks/tsk_11', {
      lane: 'revision',
      note: 'The CSV still drops the late rows.',
      suggestion: 'Filter on the exception column before writing.',
      severity: 'minor',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).record).toMatchObject({
      lane: 'revision',
      note: 'The CSV still drops the late rows.',
    });

    const board = await (await fetch(`${base}/tasks`, { headers: auth })).json();
    const newest = board.revisions[0];
    expect(newest).toMatchObject({
      taskId: 'tsk_11',
      issue: 'The CSV still drops the late rows.',
      suggestion: 'Filter on the exception column before writing.',
      severity: 'minor',
      reviewer: 'Sarah Mitchell', // who pushed back, taken from the session
    });
    expect(newest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('refuses push-back detail on anything but a move to Revision', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const badSeverity = await patch('/tasks/tsk_01', {
      lane: 'revision',
      note: 'Needs work.',
      severity: 'blocker',
    });
    expect(badSeverity.status).toBe(422);
    expect(await badSeverity.json()).toMatchObject({ code: 'invalid_severity' });

    const offLane = await patch('/tasks/tsk_01', { lane: 'done', suggestion: 'y' });
    expect(offLane.status).toBe(422);
    expect(await offLane.json()).toMatchObject({ code: 'invalid_patch' });

    const detailOnly = await patch('/tasks/tsk_01', { suggestion: 'y' });
    expect(detailOnly.status).toBe(422);
    expect(await detailOnly.json()).toMatchObject({ code: 'invalid_patch' });
  });
});

/** Creating straight into a column — the Add Task form's "Initial status". */

  it('lists the preset templates and empty custom list on the templates read path', async () => {
    const res = await get('/tasks/templates');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toContainEqual(
      expect.objectContaining({ id: 'tmpl_blank', name: 'Blank board' }),
    );
    expect(body.customTemplates).toEqual([]);
  });

  it('requires manager/HR to save a custom template', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const res = await post('/tasks/templates', { name: 'X' }, auth);
    expect(res.status).toBe(403);
  });

  it('saves and lists a custom board template', async () => {
    const payload = { name: 'Demo board', description: 'Grab bag', lanes: FIVE };
    const res = await post('/tasks/templates', payload);
    expect(res.status).toBe(201);
    const saved = await res.json();
    expect(saved.template.name).toBe('Demo board');
    const list = await get('/tasks/templates').then((response) => response.json());
    expect(list.customTemplates.some((template) => template.id.startsWith('tmpl_custom_'))).toBe(true);
  });

  it('applies a template and refreshes the board columns', async () => {
    const res = await post('/tasks/templates/tmpl_blank/apply');
    expect(res.status).toBe(200);
    const applied = await res.json();
    expect(applied.lanes).toHaveLength(5);
    expect(applied.lanes.map((lane) => lane.id)).toEqual(['todo', 'in_progress', 'review', 'revision', 'done']);
    const board = await get('/tasks').then((response) => response.json());
    expect(board.lanes.map((lane) => lane.id)).toEqual(['todo', 'in_progress', 'review', 'revision', 'done']);
  });

  it('deletes a custom template', async () => {
    const saved = await post('/tasks/templates', { name: 'Remove me', lanes: [] }).then((response) => response.json());
    const id = saved.template.id;
    const res = await del(`/tasks/templates/${id}`);
    expect(res.status).toBe(200);
    const list = await get('/tasks/templates').then((response) => response.json());
    expect(list.customTemplates.some((template) => template.id === id)).toBe(false);
  });

  it('shows a custom template with its saved columns', async () => {
    const payload = { name: 'Saved lanes', lanes: [{ id: 'a', name: 'A', wipLimit: null }] };
    const saved = await post('/tasks/templates', payload).then((response) => response.json());
    const id = saved.template.id;
    const list = await get('/tasks/templates').then((response) => response.json());
    const found = list.customTemplates.find((template) => template.id === id);
    expect(found).toMatchObject({ name: 'Saved lanes', lanes: payload.lanes });
  });

describe('task creation slots', () => {
  it('creates into a column with priority and description', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const created = await post('/tasks', {
      title: 'Draft the Q3 board pack',
      lane: 'in_progress',
      priority: 'high',
      description: 'Slides for the October review.',
      assigneeId: 'u_sita',
    });
    expect(created.status).toBe(201);
    expect((await created.json()).record).toMatchObject({
      lane: 'in_progress',
      priority: 'high',
      description: 'Slides for the October review.',
      assignee: { id: 'u_sita' },
    });
  });

  it('keeps the §7.6 rules on creation', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const review = await post('/tasks', { title: 'Anything', lane: 'review' });
    expect(review.status).toBe(422);
    expect(await review.json()).toMatchObject({ code: 'reviewer_required' });

    const revision = await post('/tasks', { title: 'Anything', lane: 'revision' });
    expect(revision.status).toBe(422);
    expect(await revision.json()).toMatchObject({ code: 'note_required' });

    const limbo = await post('/tasks', { title: 'Anything', lane: 'limbo' });
    expect(limbo.status).toBe(422);
    expect(await limbo.json()).toMatchObject({ code: 'invalid_lane' });
  });
});

/**
 * The completed history (the board's exit): a close stamps `closedAt`, the
 * task leaves `rows` and rides in `completed` — newest first — and only work
 * at the workflow's exit may be closed.
 */
describe('tasks completed history', () => {
  it('moves a closed Done task out of the board rows and into `completed`', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const closed = await post('/tasks/tsk_08/close', {});
    expect(closed.status).toBe(200);
    const { record } = await closed.json();
    expect(record.closedAt).toBeTruthy();
    expect(record.lane).toBe('done');

    const body = await (await fetch(`${base}/tasks`, { headers: auth })).json();
    expect(body.rows.find((row) => row.id === 'tsk_08')).toBeUndefined();
    const done = body.completed.find((row) => row.id === 'tsk_08');
    expect(done).toMatchObject({ lane: 'done' });
    // The fixture's pre-closed card is in the history too, newest first.
    expect(body.completed[0].id).toBe('tsk_08');
  });

  it('refuses to close a task that is still in flight', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'hr' });
    const res = await post('/tasks/tsk_01/close', {});
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'not_done' });
  });

  it('lets staff close only their own finished work', async () => {
    setAuth({ token: 'tok_test', sessionKey: 'staff' });
    const denied = await post('/tasks/tsk_07/close', {});
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: 'not_your_task' });
  });
});
