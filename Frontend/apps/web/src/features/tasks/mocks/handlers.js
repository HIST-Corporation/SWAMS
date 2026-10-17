import { http, HttpResponse } from 'msw';
import { isAuthorized } from '../../auth/mocks/authState.js';
import { addChecklistItem, removeChecklistItem, setChecklistItem } from './checklist.js';
import { listAllTemplates, listCustomTemplates, createCustomTemplate, findTemplateById, removeCustomTemplate } from './templates.js';
import { addLane, listLanes, updateLane, setLanes, deleteLane } from './laneConfig.js';
import { listRevisions } from './revisions.js';
import { canWrite, inScope, resolveScope, sessionContext } from './scope.js';
import {
  closeTask,
  createTask,
  deleteTask,
  editTask,
  getTask,
  listTasks,
  listTasksDueToday,
  resetTaskStore,
} from './store.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

/** Everything `PATCH /tasks/:id` is allowed to name. */
const PATCH_FIELDS = [
  'title',
  'description',
  'priority',
  'due',
  'assigneeId',
  'reviewerId',
  'lane',
  'note',
  'suggestion',
  'severity',
];

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

function failure(result) {
  const status = result.code === 'not_found' ? 404 : result.code.endsWith('_not_found') ? 404 : 422;
  return error(status, result.code, result.message);
}

/** Only managers/HR may reshape the board's columns. */
function requireManage(ctx) {
  if (ctx.role === 'staff') {
    return error(403, 'not_allowed', 'Only managers and HR can change the board columns.');
  }
  return null;
}

/**
 * Task board mock handlers (contract requests 11 and 22).
 * MOCK ONLY — there is no backend tasks endpoint yet; the shapes here are what
 * the UI asked for and are asserted in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - every route requires the bearer token the auth mock issued (401 else)
 *  - `GET /tasks?due=today` returns the compact Home rows (status, not lane)
 *  - `GET /tasks` returns the full board payload `{rows, completed, lanes,
 *    revisions, scope, canManage}`, scoped by the SESSION's hierarchy: an
 *    HR/manager session reads every task, a staff session only tasks in its
 *    own name or referred to it for review; closed tasks leave `rows` and
 *    ride in `completed` (newest first); `?scope=all` as staff is 403
 *    `scope_denied`
 *  - writes follow the same hierarchy (403 `not_your_task` for staff)
 *  - `POST/PATCH /tasks/lanes` adds/renames columns and sets WIP limits,
 *    manager only (403 `not_allowed`)
 *  - `PATCH /tasks/:id` edits fields and/or moves the lane; the §7.6 move rules
 *    live in the store (review needs a reviewer, revision needs a note), a
 *    push back can carry `{note, suggestion, severity}` which appends to the
 *    revision trail, and a patch that names nothing is refused
 *  - `POST/PATCH/DELETE /tasks/:id/checklist...` are the card's to-do list
 *  - failures are 401/403/404/422 and carry the reason the UI shows verbatim
 */
export const taskHandlers = [
  http.get(`${API}/tasks`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const url = new URL(request.url);
    // The compact Home view stays unscoped: it is the dashboard's due-today
    // list (contract request 11), not the board.
    if (url.searchParams.get('due') === 'today') {
      return HttpResponse.json({ rows: listTasksDueToday() });
    }
    const ctx = sessionContext();
    const scope = resolveScope(url.searchParams.get('scope'), ctx);
    if (!scope.ok) return error(scope.status, scope.code, scope.message);
    const visible = listTasks().filter((task) => inScope(task, ctx, scope.scope));
    // Closed work leaves the columns and rides along as `completed`, newest
    // first — the board reads one payload and can never disagree with itself.
    const rows = visible.filter((task) => !task.closedAt);
    const completed = visible
      .filter((task) => task.closedAt)
      .sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt)));
    // The trail follows the same hierarchy: a session never reads revisions
    // of tasks it cannot see.
    const onBoard = new Set(visible.map((task) => task.id));
    return HttpResponse.json({
      rows,
      completed,
      lanes: listLanes(),
      revisions: listRevisions().filter((row) => onBoard.has(row.taskId)),
      scope: scope.scope,
      canManage: ctx.role !== 'staff',
    });
  }),

  http.post(`${API}/tasks`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const ctx = sessionContext();
    const body = await request.json().catch(() => null);
    const result = createTask({
      title: body?.title,
      due: body?.due,
      assigneeId: body?.assigneeId,
      priority: body?.priority,
      description: body?.description,
      lane: body?.lane,
      note: body?.note,
      reviewerId: body?.reviewerId,
      // Omitted assignee means "mine" (hierarchy: my work stays visible).
      creator: body?.assigneeId === undefined ? ctx : undefined,
    });
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record }, { status: 201 });
  }),

  http.post(`${API}/tasks/lanes`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const denied = requireManage(sessionContext());
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    const result = addLane({ name: body?.name, wipLimit: body?.wipLimit });
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record }, { status: 201 });
  }),


  http.get(`${API}/tasks/templates`, ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const custom = listCustomTemplates();
    return HttpResponse.json({ templates: listAllTemplates(), customTemplates: custom });
  }),

  http.post(`${API}/tasks/templates`, async ({ request }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const denied = requireManage(sessionContext());
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    const input = body && typeof body === 'object' ? body : {};
    const result = createCustomTemplate(input);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ template: result.template }, { status: 201 });
  }),

  http.post(`${API}/tasks/templates/:id/apply`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const denied = requireManage(sessionContext());
    if (denied) return denied;
    const template = findTemplateById(params.id);
    if (!template) return error(404, 'not_found', 'That template no longer exists.');
    setLanes(template.lanes);
    return HttpResponse.json({ lanes: listLanes() });
  }),

  http.delete(`${API}/tasks/templates/:id`, ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const denied = requireManage(sessionContext());
    if (denied) return denied;
    const result = removeCustomTemplate(params.id);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ template: result.template });
  }),

  http.patch(`${API}/tasks/lanes/:id`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const denied = requireManage(sessionContext());
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    const names =
      body && typeof body === 'object' ? ['name', 'wipLimit', 'index'].filter((key) => key in body) : [];
    if (names.length === 0) return error(422, 'invalid_patch', 'That request changes nothing.');
    const patch = Object.fromEntries(names.map((key) => [key, body[key]]));
    const result = updateLane(params.id, patch);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record });
  }),

  http.delete(`${API}/tasks/lanes/:id`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const denied = requireManage(sessionContext());
    if (denied) return denied;
    const result = deleteLane(params.id);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ ok: true });
  }),

  http.delete(`${API}/tasks/:id`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const ctx = sessionContext();
    const existing = getTask(params.id);
    if (!existing) return error(404, 'not_found', 'That task no longer exists.');
    const result = deleteTask(params.id, { id: ctx.id });
    if (!result.ok) return failure(result);
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${API}/tasks/:id/close`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const ctx = sessionContext();
    const existing = getTask(params.id);
    if (!existing) return error(404, 'not_found', 'That task no longer exists.');
    if (!canWrite(existing, ctx)) {
      return error(
        403,
        'not_your_task',
        'That task is not assigned to you or referred for your review.',
      );
    }
    const result = closeTask(params.id, ctx);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record });
  }),

  http.patch(`${API}/tasks/:id`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const ctx = sessionContext();
    const existing = getTask(params.id);
    if (!existing) return error(404, 'not_found', 'That task no longer exists.');
    if (!canWrite(existing, ctx)) {
      return error(
        403,
        'not_your_task',
        'That task is not assigned to you or referred for your review.',
      );
    }
    const body = await request.json().catch(() => null);
    // A request that names nothing to change is a 422, never a silent no-op.
    const names = body && typeof body === 'object' ? PATCH_FIELDS.filter((key) => key in body) : [];
    const pushBackOnly =
      names.length > 0 && names.every((key) => key === 'suggestion' || key === 'severity');
    if (names.length === 0 || pushBackOnly) {
      return error(422, 'invalid_patch', 'That request changes nothing.');
    }
    const patch = Object.fromEntries(names.map((key) => [key, body[key]]));
    const result = editTask(params.id, patch, ctx);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record });
  }),

  http.post(`${API}/tasks/:id/checklist`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    const result = addChecklistItem(params.id, body?.text);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record }, { status: 201 });
  }),

  http.patch(`${API}/tasks/:id/checklist/:itemId`, async ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const body = await request.json().catch(() => null);
    if (typeof body?.done !== 'boolean') {
      return error(422, 'invalid_done', 'A checklist item is either done or not done.');
    }
    const result = setChecklistItem(params.id, params.itemId, body.done);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record });
  }),

  http.delete(`${API}/tasks/:id/checklist/:itemId`, ({ request, params }) => {
    if (!isAuthorized(request)) return error(401, 'unauthenticated', 'Sign in to continue.');
    const result = removeChecklistItem(params.id, params.itemId);
    if (!result.ok) return failure(result);
    return HttpResponse.json({ record: result.record });
  }),
];

export { getTask, resetTaskStore };
