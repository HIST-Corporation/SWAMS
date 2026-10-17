// @ts-check
/**
 * Task board routes — contract rows 11 and 22. Shapes match
 * `features/tasks/mocks/handlers.js`: one payload owns the board
 * ({rows, completed, lanes, revisions, scope, canManage}), the compact
 * `?due=today` view, the checklist, the lane config and the templates.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { AppError, notFound } from '../../common/errors.js';
import { audit } from '../../middleware/audit.js';
import { scopeFor } from '../../middleware/scope.js';
import { nepalToday } from '../../common/time.js';
import {
  taskRow,
  getTask,
  canWrite,
  statusOfLane,
  pushRevision,
  personFor,
  checkLaneRules,
  checkRevisionDetail,
  laneIds,
  PRIORITIES,
  DATE_RE,
  MAX_DESCRIPTION,
  TASK_INCLUDE,
} from './store.js';

const router = Router();
const failStatus = (code) => (code === 'not_found' || code.endsWith('_not_found') ? 404 : 422);
const failure = (result) =>
  new AppError(result.code, result.message, { httpStatus: failStatus(result.code) });

/** Session context for the board's hierarchy decisions. */
function ctxOf(req) {
  return { role: req.principal.role, userId: req.principal.userId, name: req.principal.name };
}

/**
 * Resolve `?scope=` against the session (mock parity): no parameter means the
 * session's own lens, staff asking for `all` is refused rather than narrowed.
 */
function resolveScope(param, ctx) {
  const scope = param ?? (ctx.role === 'staff' ? 'self' : 'all');
  if (scope !== 'self' && scope !== 'all') {
    throw new AppError('invalid_scope', 'Scope must be "self" or "all".', { httpStatus: 422 });
  }
  if (scope === 'all' && ctx.role === 'staff') {
    throw new AppError('scope_denied', 'This session can only see its own work.', { httpStatus: 403 });
  }
  return scope;
}

/** GET /tasks — the board, or the compact `?due=today` rows for Home. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const ctx = ctxOf(req);

    if (req.query.due === 'today') {
      const rows = await prisma.task.findMany({
        where: { orgId, due: nepalToday(), closedAt: null },
        select: { id: true, title: true, due: true, lane: true },
      });
      return res.json({
        rows: rows.map(({ id, title, due, lane }) => ({ id, title, due, status: statusOfLane(lane) })),
      });
    }

    const scope = resolveScope(
      typeof req.query.scope === 'string' ? req.query.scope : undefined,
      ctx,
    );
    const where = { orgId };
    if (scope === 'self') {
      where.OR = [{ assigneeId: ctx.userId }, { reviewerId: ctx.userId }];
    }
    const [tasks, lanes, revisions] = await Promise.all([
      prisma.task.findMany({ where, include: TASK_INCLUDE, orderBy: { updatedAt: 'desc' } }),
      prisma.taskLane.findMany({ where: { orgId }, orderBy: { position: 'asc' } }),
      prisma.taskRevision.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } }),
    ]);
    const onBoard = new Set(tasks.map((t) => t.id));
    return res.json({
      rows: tasks.filter((t) => !t.closedAt).map(taskRow),
      completed: tasks
        .filter((t) => t.closedAt)
        .sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt)))
        .map(taskRow),
      lanes: lanes.map((l) => ({ id: l.key, name: l.name, wipLimit: l.wipLimit })),
      revisions: revisions
        .filter((r) => onBoard.has(r.taskId))
        .map((r) => ({
          id: r.id,
          taskId: r.taskId,
          taskTitle: r.taskTitle,
          issue: r.issue,
          suggestion: r.suggestion,
          severity: r.severity,
          reviewer: r.reviewer,
          date: r.date,
        })),
      scope,
      canManage: ctx.role !== 'staff',
    });
  }),
);

const createSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  lane: z.string().optional(),
  priority: z.string().optional(),
  kind: z.string().optional(),
  meta: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  reviewerId: z.string().optional().nullable(),
  due: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

/** POST /tasks — 201 {record}; omitted assignee means "mine" (§4.1). */
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const ctx = ctxOf(req);
    const body = req.body;
    const trimmed = body.title?.trim();
    if (!trimmed) {
      throw failure({ ok: false, code: 'title_required', message: 'A title is required.' });
    }
    if (body.due && !DATE_RE.test(body.due)) {
      throw failure({ ok: false, code: 'invalid_due', message: 'Due must be a calendar date.' });
    }
    if (body.priority !== undefined && body.priority !== null && !PRIORITIES.includes(body.priority)) {
      throw failure({ ok: false, code: 'invalid_priority', message: 'Priority must be low, normal or high.' });
    }
    if (body.description && body.description.length > MAX_DESCRIPTION) {
      throw failure({
        ok: false,
        code: 'invalid_description',
        message: `Keep the description under ${MAX_DESCRIPTION} characters.`,
      });
    }
    const assignee =
      body.assigneeId === undefined
        ? { ok: true, person: { id: ctx.userId, name: ctx.name, initials: req.principal.initials } }
        : await personFor(orgId, body.assigneeId, 'unknown_assignee');
    if (!assignee.ok) throw failure(assignee);
    const reviewer = await personFor(orgId, body.reviewerId, 'unknown_reviewer');
    if (!reviewer.ok) throw failure(reviewer);
    const targetLane = body.lane ?? 'todo';
    const ruled = await checkLaneRules(orgId, { reviewer: reviewer.person }, targetLane, body.note);
    if (!ruled.ok) throw failure(ruled);

    const task = await prisma.task.create({
      data: {
        orgId,
        title: trimmed,
        description: body.description?.trim() ?? '',
        lane: targetLane,
        priority: body.priority ?? 'normal',
        kind: body.kind ?? 'review',
        meta: body.meta ?? '',
        assigneeId: assignee.person?.id ?? null,
        reviewerId: reviewer.person?.id ?? null,
        due: body.due ?? null,
        note: body.note?.trim() || null,
      },
      include: TASK_INCLUDE,
    });
    await audit(req, 'tasks', 'taskCreated', { taskId: task.id });
    return res.json({ record: taskRow(task) }, 201);
  }),
);

const PATCH_FIELDS = [
  'title', 'description', 'priority', 'due', 'assigneeId', 'reviewerId', 'lane', 'note', 'suggestion', 'severity',
];

/** PATCH /tasks/:id — edit fields and/or move the lane (§7.6 rules). */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const ctx = ctxOf(req);
    const existing = await getTask(orgId, req.params.id);
    if (!existing) throw notFound('That task no longer exists.');
    if (!canWrite(existing, ctx)) {
      throw new AppError('not_your_task', 'That task is not assigned to you or referred for your review.', {
        httpStatus: 403,
      });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const names = PATCH_FIELDS.filter((key) => key in body);
    const pushBackOnly =
      names.length > 0 && names.every((key) => key === 'suggestion' || key === 'severity');
    if (names.length === 0 || pushBackOnly) {
      throw new AppError('invalid_patch', 'That request changes nothing.', { httpStatus: 422 });
    }
    const patch = Object.fromEntries(names.map((key) => [key, body[key]]));

    if ('title' in patch && !String(patch.title ?? '').trim()) {
      throw failure({ ok: false, code: 'title_required', message: 'A title is required.' });
    }
    if ('description' in patch && typeof patch.description === 'string' && patch.description.length > MAX_DESCRIPTION) {
      throw failure({
        ok: false,
        code: 'invalid_description',
        message: `Keep the description under ${MAX_DESCRIPTION} characters.`,
      });
    }
    if ('priority' in patch && !PRIORITIES.includes(patch.priority)) {
      throw failure({ ok: false, code: 'invalid_priority', message: 'Priority must be low, normal or high.' });
    }
    if ('due' in patch && patch.due !== null && !DATE_RE.test(String(patch.due))) {
      throw failure({ ok: false, code: 'invalid_due', message: 'Due must be a calendar date.' });
    }
    if (('suggestion' in patch || 'severity' in patch) && patch.lane !== 'revision') {
      throw new AppError('invalid_patch', 'Suggestions and severity belong to a move to Revision.', {
        httpStatus: 422,
      });
    }
    const detail = checkRevisionDetail(patch);
    if (!detail.ok) throw failure(detail);
    const assignee = 'assigneeId' in patch
      ? await personFor(orgId, patch.assigneeId, 'unknown_assignee')
      : { ok: true };
    if (!assignee.ok) throw failure(assignee);
    const reviewer = 'reviewerId' in patch
      ? await personFor(orgId, patch.reviewerId, 'unknown_reviewer')
      : { ok: true };
    if (!reviewer.ok) throw failure(reviewer);
    const nextReviewer = 'reviewerId' in patch ? reviewer.person : existing.reviewer;
    const ruled = await checkLaneRules(orgId, { ...existing, reviewer: nextReviewer }, patch.lane, patch.note);
    if (!ruled.ok) throw failure(ruled);

    const data = {};
    if ('title' in patch) data.title = String(patch.title).trim();
    if ('description' in patch) data.description = String(patch.description ?? '').trim();
    if ('priority' in patch) data.priority = patch.priority;
    if ('due' in patch) data.due = patch.due;
    if ('assigneeId' in patch) data.assigneeId = assignee.person?.id ?? null;
    if ('reviewerId' in patch) data.reviewerId = reviewer.person?.id ?? null;
    if (patch.lane) data.lane = patch.lane;
    if (patch.note?.trim()) data.note = patch.note.trim();

    const was = existing.lane;
    const updated = await prisma.task.update({
      where: { id: existing.id },
      data,
      include: TASK_INCLUDE,
    });
    if (patch.lane === 'revision' && was !== 'revision') {
      await pushRevision(orgId, updated, {
        issue: patch.note ?? updated.note,
        suggestion: patch.suggestion,
        severity: patch.severity,
        reviewer: ctx.name,
      });
    }
    await audit(req, 'tasks', 'taskUpdated', { taskId: updated.id });
    return res.json({ record: taskRow(updated) });
  }),
);

/** DELETE /tasks/:id — owner/reviewer or manager (§7.6). */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const ctx = ctxOf(req);
    const existing = await getTask(orgId, req.params.id);
    if (!existing) throw notFound('That task no longer exists.');
    if (!canWrite(existing, ctx)) {
      throw new AppError('not_your_task', 'Only the owner or a reviewer can delete this task.', {
        httpStatus: 403,
      });
    }
    await prisma.task.delete({ where: { id: existing.id } });
    await audit(req, 'tasks', 'taskDeleted', { taskId: existing.id });
    return res.json({ ok: true });
  }),
);

/** POST /tasks/:id/close — only work at the workflow's exit closes. */
router.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const ctx = ctxOf(req);
    const existing = await getTask(orgId, req.params.id);
    if (!existing) throw notFound('That task no longer exists.');
    const ids = await laneIds(orgId);
    const exitLane = ids[ids.length - 1] ?? 'done';
    if (existing.lane !== 'done' && existing.lane !== exitLane) {
      throw failure({ ok: false, code: 'not_done', message: 'Only a finished task can be closed.' });
    }
    if (!canWrite(existing, ctx)) {
      throw new AppError('not_your_task', 'Only the owner or a reviewer can close this task.', {
        httpStatus: 403,
      });
    }
    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: { closedAt: new Date() },
      include: TASK_INCLUDE,
    });
    return res.json({ record: taskRow(updated) });
  }),
);

/** POST /tasks/:id/checklist — add one to-do item. */
router.post(
  '/:id/checklist',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const existing = await getTask(orgId, req.params.id);
    if (!existing) throw notFound('That task no longer exists.');
    const text = String(req.body?.text ?? '').trim();
    if (!text) {
      throw failure({ ok: false, code: 'text_required', message: 'Give the item a name.' });
    }
    await prisma.taskChecklistItem.create({ data: { taskId: existing.id, title: text } });
    const fresh = await getTask(orgId, existing.id);
    return res.json({ record: taskRow(fresh) }, 201);
  }),
);

/** PATCH /tasks/:id/checklist/:itemId — tick or untick. */
router.patch(
  '/:id/checklist/:itemId',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const existing = await getTask(orgId, req.params.id);
    if (!existing) throw notFound('That task no longer exists.');
    if (typeof req.body?.done !== 'boolean') {
      throw new AppError('invalid_done', 'A checklist item is either done or not done.', {
        httpStatus: 422,
      });
    }
    const item = await prisma.taskChecklistItem.findFirst({
      where: { id: req.params.itemId, taskId: existing.id },
    });
    if (!item) {
      throw failure({ ok: false, code: 'item_not_found', message: 'That checklist item no longer exists.' });
    }
    await prisma.taskChecklistItem.update({ where: { id: item.id }, data: { done: req.body.done } });
    const fresh = await getTask(orgId, existing.id);
    return res.json({ record: taskRow(fresh) });
  }),
);

/** DELETE /tasks/:id/checklist/:itemId — remove one item. */
router.delete(
  '/:id/checklist/:itemId',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const existing = await getTask(orgId, req.params.id);
    if (!existing) throw notFound('That task no longer exists.');
    const item = await prisma.taskChecklistItem.findFirst({
      where: { id: req.params.itemId, taskId: existing.id },
    });
    if (!item) {
      throw failure({ ok: false, code: 'item_not_found', message: 'That checklist item no longer exists.' });
    }
    await prisma.taskChecklistItem.delete({ where: { id: item.id } });
    const fresh = await getTask(orgId, existing.id);
    return res.json({ record: taskRow(fresh) });
  }),
);

const MAX_NAME = 40;

/** Only managers/HR may reshape the board's columns. */
function requireManage(ctx) {
  if (ctx.role === 'staff') {
    throw new AppError('not_allowed', 'Only managers and HR can change the board columns.', {
      httpStatus: 403,
    });
  }
}

/** A WIP limit is null (none) or a whole number 1–99; never zero. */
function validateWip(value) {
  if (value === null || value === undefined) return { ok: true, wipLimit: null };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    return fail('invalid_wip', 'The WIP limit must be a whole number from 1 to 99.');
  }
  return { ok: true, wipLimit: n };
}

const laneRow = (l) => ({ id: l.key, name: l.name, wipLimit: l.wipLimit });

/** GET /tasks/lanes — the board's column configuration. */
router.get(
  '/lanes',
  asyncHandler(async (req, res) => {
    const lanes = await prisma.taskLane.findMany({
      where: { orgId: req.principal.orgId },
      orderBy: { position: 'asc' },
    });
    return res.json({ rows: lanes.map(laneRow) });
  }),
);

const laneCreateSchema = z.object({
  name: z.string().min(1),
  wipLimit: z.number().int().nullable().optional(),
});

/** POST /tasks/lanes — append a manager-defined column. */
router.post(
  '/lanes',
  validate(laneCreateSchema),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    requireManage(ctxOf(req));
    const name = String(req.body.name ?? '').trim();
    if (!name || name.length > MAX_NAME) {
      throw failure({ ok: false, code: 'invalid_name', message: 'Give the column a name (max 40 chars).' });
    }
    const existing = await prisma.taskLane.findMany({ where: { orgId } });
    if (existing.some((l) => l.name?.toLowerCase() === name.toLowerCase())) {
      throw failure({ ok: false, code: 'lane_exists', message: 'A column with that name already exists.' });
    }
    const checkedWip = validateWip(req.body.wipLimit);
    if (!checkedWip.ok) throw failure(checkedWip);
    const lane = await prisma.taskLane.create({
      data: {
        orgId,
        key: `col_${Math.random().toString(36).slice(2, 8)}`,
        name,
        wipLimit: checkedWip.wipLimit,
        position: existing.length,
      },
    });
    return res.json({ record: laneRow(lane) }, 201);
  }),
);

/** PATCH /tasks/lanes/:id — rename, reorder or WIP-limit a column. */
router.patch(
  '/lanes/:id',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    requireManage(ctxOf(req));
    const lane = await prisma.taskLane.findFirst({ where: { id: req.params.id, orgId } });
    if (!lane) {
      throw failure({ ok: false, code: 'lane_not_found', message: 'That column no longer exists.' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const names = ['name', 'wipLimit', 'index'].filter((key) => key in body);
    if (names.length === 0) {
      throw new AppError('invalid_patch', 'That request changes nothing.', { httpStatus: 422 });
    }
    const data = {};
    if ('name' in body) {
      const trimmed = String(body.name ?? '').trim();
      if (trimmed) {
        if (trimmed.length > MAX_NAME) {
          throw failure({ ok: false, code: 'invalid_name', message: 'Keep the column name under 40 characters.' });
        }
        const clash = await prisma.taskLane.findFirst({
          where: { orgId, name: { equals: trimmed, mode: 'insensitive' }, NOT: { id: lane.id } },
        });
        if (clash) {
          throw failure({ ok: false, code: 'lane_exists', message: 'A column with that name already exists.' });
        }
        data.name = trimmed;
      } else {
        data.name = null; // blank restores the standard i18n label
      }
    }
    if ('wipLimit' in body) {
      const checkedWip = validateWip(body.wipLimit);
      if (!checkedWip.ok) throw failure(checkedWip);
      data.wipLimit = checkedWip.wipLimit;
    }
    if ('index' in body && Number.isInteger(body.index)) {
      data.position = Math.max(0, body.index);
    }
    const updated = await prisma.taskLane.update({ where: { id: lane.id }, data });
    return res.json({ record: laneRow(updated) });
  }),
);

/** DELETE /tasks/lanes/:id — tasks stay put (readded to the first lane). */
router.delete(
  '/lanes/:id',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    requireManage(ctxOf(req));
    const lane = await prisma.taskLane.findFirst({ where: { id: req.params.id, orgId } });
    if (!lane) {
      throw failure({ ok: false, code: 'lane_not_found', message: 'That column no longer exists.' });
    }
    await prisma.taskLane.delete({ where: { id: lane.id } });
    return res.json({ ok: true });
  }),
);

/** Predefined board templates offered to every session (inspiration presets). */
const PRE_DEFINED_TEMPLATES = [
  {
    id: 'tmpl_blank',
    name: 'Blank board',
    description: 'Start from an empty board with the five standard workflow lanes.',
    lanes: [
      { id: 'todo', name: null, wipLimit: 4 },
      { id: 'in_progress', name: null, wipLimit: 3 },
      { id: 'review', name: null, wipLimit: 3 },
      { id: 'revision', name: null, wipLimit: null },
      { id: 'done', name: null, wipLimit: null },
    ],
  },
  {
    id: 'tmpl_it_support',
    name: 'IT Support',
    description: 'A typical helpdesk queue from incoming request to resolved.',
    lanes: [
      { id: 'todo', name: 'To do', wipLimit: 4 },
      { id: 'in_progress', name: 'In progress', wipLimit: 3 },
      { id: 'review', name: 'Review', wipLimit: 3 },
      { id: 'revision', name: 'Revision', wipLimit: null },
      { id: 'done', name: 'Done', wipLimit: null },
    ],
  },
  {
    id: 'tmpl_sales_pipeline',
    name: 'Sales Pipeline',
    description: 'Stage opportunities from lead to closed.',
    lanes: [
      { id: 'lead', name: 'Lead', wipLimit: 6 },
      { id: 'qualified', name: 'Qualified', wipLimit: 5 },
      { id: 'proposal', name: 'Proposal', wipLimit: 3 },
      { id: 'won', name: 'Closed won', wipLimit: null },
    ],
  },
  {
    id: 'tmpl_project_management',
    name: 'Project Management',
    description: 'Track project work through phases from backlog to done.',
    lanes: [
      { id: 'backlog', name: 'Backlog', wipLimit: null },
      { id: 'in_progress', name: 'In progress', wipLimit: 3 },
      { id: 'blocked', name: 'Blocked', wipLimit: 2 },
      { id: 'done', name: 'Done', wipLimit: null },
    ],
  },
  {
    id: 'tmpl_engineering_sprint',
    name: 'Engineering Sprint',
    description: 'Review sprint work before it moves into revision.',
    lanes: [
      { id: 'sprintBacklog', name: 'Sprint backlog', wipLimit: null },
      { id: 'in_progress', name: 'In progress', wipLimit: 4 },
      { id: 'review', name: 'Review', wipLimit: 3 },
      { id: 'done', name: 'Done', wipLimit: null },
    ],
  },
];

function templateRow(record) {
  const payload = record.payload ?? {};
  return {
    id: record.id,
    name: record.name,
    description: payload.description ?? '',
    lanes: payload.lanes ?? [],
    createdBy: payload.createdBy ?? null,
    createdAt: payload.createdAt ?? record.createdAt.toISOString(),
  };
}

/** GET /tasks/templates — presets plus this org's custom templates. */
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const custom = await prisma.taskTemplate.findMany({
      where: { orgId: req.principal.orgId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({
      templates: [...PRE_DEFINED_TEMPLATES, ...custom.map(templateRow)],
      customTemplates: custom.map(templateRow),
    });
  }),
);

/** POST /tasks/templates — save the current board as a template (managers). */
router.post(
  '/templates',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    requireManage(ctxOf(req));
    const name = String(req.body?.name ?? '').trim();
    if (!name) {
      throw failure({ ok: false, code: 'invalid_name', message: 'Give the template a name.' });
    }
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const lanes = Array.isArray(req.body?.lanes) ? req.body.lanes : [];
    const record = await prisma.taskTemplate.create({
      data: {
        orgId,
        name,
        payload: { description, lanes, createdBy: userId, createdAt: new Date().toISOString() },
      },
    });
    return res.json({ template: templateRow(record) }, 201);
  }),
);

/** POST /tasks/templates/:id/apply — replace the board's columns. */
router.post(
  '/templates/:id/apply',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    requireManage(ctxOf(req));
    const custom = await prisma.taskTemplate.findFirst({
      where: { id: req.params.id, orgId },
    });
    const template = custom
      ? templateRow(custom)
      : PRE_DEFINED_TEMPLATES.find((t) => t.id === req.params.id);
    if (!template) throw notFound('That template no longer exists.');

    await prisma.taskLane.deleteMany({ where: { orgId } });
    await prisma.taskLane.createMany({
      data: template.lanes.map((lane, index) => ({
        orgId,
        key: lane.id,
        name: lane.name ?? null,
        wipLimit: lane.wipLimit ?? null,
        position: index,
      })),
    });
    const lanes = await prisma.taskLane.findMany({
      where: { orgId },
      orderBy: { position: 'asc' },
    });
    return res.json({ lanes: lanes.map(laneRow) });
  }),
);

/** DELETE /tasks/templates/:id — remove a custom template. */
router.delete(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    requireManage(ctxOf(req));
    const custom = await prisma.taskTemplate.findFirst({ where: { id: req.params.id, orgId } });
    if (!custom) throw notFound('That template no longer exists.');
    await prisma.taskTemplate.delete({ where: { id: custom.id } });
    return res.json({ template: templateRow(custom) });
  }),
);






export default router;
