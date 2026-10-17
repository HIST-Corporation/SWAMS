// @ts-check
/**
 * Task board rules (§7.6) backed by Postgres. Every write returns
 * `{ok:true, record}` or `{ok:false, code, message}` — the same answer shape
 * the frontend mock store uses, so the UI shows the server's message verbatim.
 */
import { prisma } from '../../db/prisma.js';
import { nepalToday } from '../../common/time.js';

const PRIORITIES = ['low', 'normal', 'high'];
const SEVERITIES = ['major', 'minor'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DESCRIPTION = 2000;
const MAX_SUGGESTION = 500;

const fail = (code, message) => ({ ok: false, code, message });

/** Serialize a task + checklist into the board row shape. */
export function taskRow(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    lane: task.lane,
    priority: task.priority,
    kind: task.kind,
    meta: task.meta ?? '',
    assignee: task.assignee
      ? { id: task.assignee.id, name: task.assignee.name, initials: task.assignee.initials }
      : null,
    reviewer: task.reviewer
      ? { id: task.reviewer.id, name: task.reviewer.name, initials: task.reviewer.initials }
      : null,
    due: task.due ?? null,
    note: task.note ?? null,
    checklist: (task.checklist ?? []).map((item) => ({ id: item.id, text: item.title, done: item.done })),
    closedAt: task.closedAt?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
  };
}

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, initials: true } },
  reviewer: { select: { id: true, name: true, initials: true } },
  checklist: { orderBy: { id: 'asc' } },
};

/** Load one task within the org. */
export async function getTask(orgId, id) {
  return prisma.task.findFirst({ where: { id, orgId }, include: TASK_INCLUDE });
}

/** Resolve an assignee/reviewer id against the org's people. */
async function personFor(orgId, value, code) {
  if (value === null || value === undefined || value === '') return { ok: true, person: null };
  const person = await prisma.user.findFirst({
    where: { id: value, orgId },
    select: { id: true, name: true, initials: true },
  });
  if (!person) return fail(code, 'That person is not on the team.');
  return { ok: true, person };
}

/** Configured lane keys for the org (board order). */
export async function laneIds(orgId) {
  const lanes = await prisma.taskLane.findMany({ where: { orgId }, orderBy: { position: 'asc' } });
  return lanes.map((l) => l.key);
}

/** The §7.6 lane rules shared by every write that can change a lane. */
async function checkLaneRules(orgId, task, lane, note) {
  if (lane === undefined || lane === null) return { ok: true };
  const ids = await laneIds(orgId);
  if (!ids.includes(lane)) return fail('invalid_lane', 'That lane does not exist.');
  if (lane === 'review' && !task.reviewer) {
    return fail('reviewer_required', 'Add a reviewer before moving this task to Review.');
  }
  if (lane === 'revision' && !(note ?? task.note)?.trim()) {
    return fail('note_required', 'A short note is required for revision.');
  }
  return { ok: true };
}

function checkRevisionDetail({ suggestion, severity } = {}) {
  if (severity !== undefined && !SEVERITIES.includes(severity)) {
    return fail('invalid_severity', 'Severity must be major or minor.');
  }
  if (suggestion !== undefined) {
    if (typeof suggestion !== 'string') return fail('invalid_suggestion', 'A suggestion must be text.');
    if (suggestion.length > MAX_SUGGESTION) {
      return fail('invalid_suggestion', `Keep the suggestion under ${MAX_SUGGESTION} characters.`);
    }
  }
  return { ok: true };
}

/** Board write authority: staff move only their own/reviewed work (§7.6). */
export function canWrite(task, ctx) {
  if (ctx.role !== 'staff') return true;
  return task.assignee?.id === ctx.userId || task.reviewer?.id === ctx.userId;
}

/** Lane → Home's compact status vocabulary. */
export function statusOfLane(lane) {
  if (lane === 'done') return 'done';
  if (lane === 'todo') return 'todo';
  return 'in_progress';
}

/** Append one row to the revision trail. */
async function pushRevision(orgId, task, { issue, suggestion = '', severity = 'major', reviewer = '' }) {
  await prisma.taskRevision.create({
    data: {
      orgId,
      taskId: task.id,
      taskTitle: task.title,
      issue: String(issue ?? '').trim() || task.note || '',
      suggestion: String(suggestion ?? '').trim(),
      severity: severity === 'minor' ? 'minor' : 'major',
      reviewer: reviewer || task.reviewer?.name || '—',
      date: nepalToday(),
    },
  });
}

export { TASK_INCLUDE, pushRevision, personFor, checkLaneRules, checkRevisionDetail, PRIORITIES, SEVERITIES, DATE_RE, MAX_DESCRIPTION };
