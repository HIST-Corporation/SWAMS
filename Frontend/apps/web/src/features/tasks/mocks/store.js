import { laneIds, resetLaneConfig } from './laneConfig.js';
import { pushRevision, resetRevisions } from './revisions.js';
import { LANES, PEOPLE, SEED, nepalIso } from './seeds.js';

/**
 * Mutable task store for the mock only. One store feeds BOTH views of
 * `GET /tasks`: the compact `?due=today` rows Home renders and the full board
 * rows, so the dashboard and the board can never disagree about the same task.
 *
 * Every write returns `{ok: true, record}` or `{ok: false, code, message}` —
 * the server's rules live HERE, never in a component (§7.6), and the UI shows
 * the message it gets back verbatim.
 */

const PRIORITIES = ['low', 'normal', 'high'];
const SEVERITIES = ['major', 'minor'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DESCRIPTION = 2000;
const MAX_SUGGESTION = 500;

/** Shared internals — also used by `checklist.js`, split out for file size. */
export const clone = (task) => ({
  ...task,
  checklist: (task.checklist ?? []).map((item) => ({ ...item })),
});
export const fail = (code, message) => ({ ok: false, code, message });
export const stamp = () => new Date().toISOString();
const notFound = () => fail('not_found', 'That task no longer exists.');

const store = SEED.map(clone);

/** Restore the fixture board, columns and trail (tests only). */
export function resetTaskStore() {
  store.length = 0;
  store.push(...SEED.map(clone));
  resetLaneConfig();
  resetRevisions();
}

export function listTasks() {
  return store.map(clone);
}

export function getTask(id) {
  return store.find((task) => task.id === id) ?? null;
}

export { LANES, PEOPLE, nepalIso };

/** Resolve an assignee/reviewer id to the roster person, or `null` when cleared. */
function personFor(value, code) {
  if (value === null || value === undefined || value === '') return { ok: true, person: null };
  const person = PEOPLE.find((row) => row.id === value);
  if (!person) return fail(code, 'That person is not on the team.');
  return { ok: true, person: { id: person.id, name: person.name, initials: person.initials } };
}

/** Extra payload validation shared by every move into Revision. */
function checkRevisionDetail({ suggestion, severity } = {}) {
  if (severity !== undefined && !SEVERITIES.includes(severity)) {
    return fail('invalid_severity', 'Severity must be major or minor.');
  }
  if (suggestion !== undefined) {
    if (typeof suggestion !== 'string')
      return fail('invalid_suggestion', 'A suggestion must be text.');
    if (suggestion.length > MAX_SUGGESTION) {
      return fail('invalid_suggestion', `Keep the suggestion under ${MAX_SUGGESTION} characters.`);
    }
  }
  return { ok: true };
}

/**
 * The §7.6 lane rules, shared by every write that can change a lane: Review
 * needs a reviewer, Revision needs a note, and only configured columns exist
 * (the five workflow lanes plus any a manager added).
 * @returns {{ok: true} | {ok: false, code: string, message: string}}
 */
export function checkLaneRules(task, lane, note) {
  if (lane === undefined || lane === null) return { ok: true };
  if (!laneIds().includes(lane)) return fail('invalid_lane', 'That lane does not exist.');
  if (lane === 'review' && !task.reviewer) {
    return fail('reviewer_required', 'Add a reviewer before moving this task to Review.');
  }
  if (lane === 'revision' && !(note ?? task.note)?.trim()) {
    return fail('note_required', 'A short note is required for revision.');
  }
  return { ok: true };
}

/**
 * Apply a lane move to the store. A transition into Revision appends a row to
 * the history trail (`extra` carries the push-back detail the dialog collects).
 * @param {string} id, `string` lane, `string?` note, `object?` extra
 */
export function moveTask(id, lane, note, extra = {}) {
  const task = getTask(id);
  if (!task) return notFound();
  const ruled = checkLaneRules(task, lane, note);
  if (!ruled.ok) return ruled;
  const detail = checkRevisionDetail(extra);
  if (!detail.ok) return detail;

  const was = task.lane;
  task.lane = lane;
  if (lane === 'revision' && note?.trim()) task.note = note.trim();
  task.updatedAt = stamp();
  if (lane === 'revision' && was !== 'revision') {
    pushRevision(task, {
      issue: note ?? task.note,
      suggestion: extra.suggestion,
      severity: extra.severity,
      reviewer: extra.reviewer,
    });
  }
  return { ok: true, record: clone(task) };
}

/**
 * Edit a task's own fields — the detail view's writes (contract request 22).
 * Only the keys present in `patch` change; anything unknown is ignored, and a
 * patch that names nothing is refused by the handler as `invalid_patch`.
 * `ctx.name` (who pushed back) seeds the trail when the patch moves to Revision.
 */
export function editTask(id, patch, ctx = {}) {
  const task = getTask(id);
  if (!task) return notFound();

  if ('title' in patch && !String(patch.title ?? '').trim()) {
    return fail('title_required', 'A title is required.');
  }
  if ('description' in patch) {
    if (typeof patch.description !== 'string') {
      return fail('invalid_description', 'A description must be text.');
    }
    if (patch.description.length > MAX_DESCRIPTION) {
      return fail(
        'invalid_description',
        `Keep the description under ${MAX_DESCRIPTION} characters.`,
      );
    }
  }
  if ('priority' in patch && !PRIORITIES.includes(patch.priority)) {
    return fail('invalid_priority', 'Priority must be low, normal or high.');
  }
  if ('due' in patch && patch.due !== null && !DATE_RE.test(String(patch.due))) {
    return fail('invalid_due', 'Due must be a calendar date.');
  }
  // Push-back detail only makes sense on a move into Revision.
  if (('suggestion' in patch || 'severity' in patch) && patch.lane !== 'revision') {
    return fail('invalid_patch', 'Suggestions and severity belong to a move to Revision.');
  }
  const detail = checkRevisionDetail(patch);
  if (!detail.ok) return detail;

  const assignee =
    'assigneeId' in patch ? personFor(patch.assigneeId, 'unknown_assignee') : { ok: true };
  if (!assignee.ok) return assignee;
  const reviewer =
    'reviewerId' in patch ? personFor(patch.reviewerId, 'unknown_reviewer') : { ok: true };
  if (!reviewer.ok) return reviewer;

  // The lane rules apply to an edit too — the reviewer being set in the same
  // patch counts, so one request can move a card to Review and name it.
  const nextReviewer = 'reviewerId' in patch ? reviewer.person : task.reviewer;
  const ruled = checkLaneRules({ ...task, reviewer: nextReviewer }, patch.lane, patch.note);
  if (!ruled.ok) return ruled;

  const was = task.lane;
  if ('title' in patch) task.title = String(patch.title).trim();
  if ('description' in patch) task.description = patch.description.trim();
  if ('priority' in patch) task.priority = patch.priority;
  if ('due' in patch) task.due = patch.due;
  if ('assigneeId' in patch) task.assignee = assignee.person;
  if ('reviewerId' in patch) task.reviewer = reviewer.person;
  if (patch.lane) task.lane = patch.lane;
  if (patch.note?.trim()) task.note = patch.note.trim();
  task.updatedAt = stamp();
  if (patch.lane === 'revision' && was !== 'revision') {
    pushRevision(task, {
      issue: patch.note ?? task.note,
      suggestion: patch.suggestion,
      severity: patch.severity,
      reviewer: ctx.name,
    });
  }
  return { ok: true, record: clone(task) };
}

/**
 * Create a task. Omitted `lane` starts it in To do; omitted `assigneeId`
 * means "mine" — the creator, so work a staff member raises stays on their
 * own board under the hierarchy scope. `reviewerId`/`note` follow the §7.6
 * rules for a task created straight into Review or Revision.
 */
/** Delete a task. Only the owner (`ctx.id` = assigneeId of the task) or a
 * reviewer may delete it (§7.6). */
export function deleteTask(id, ctx = {}) {
  const index = store.findIndex((task) => task.id === id);
  if (index === -1) return notFound();
  const task = store[index];
  // A manager/HR session may delete any task; a staff session only its own
  // work or a task it is the reviewer of (§7.6).
  if (ctx.role === 'staff') {
    const byOwner = ctx.id != null && task.assignee?.id === ctx.id;
    const byReviewer = task.reviewer?.id === ctx.id;
    if (!byOwner && !byReviewer) {
      return fail('not_your_task', 'Only the owner or a reviewer can delete this task.');
    }
  }
  store.splice(index, 1);
  return { ok: true, record: clone(task) };
}

/**
 * Close a finished task: it leaves the board's columns for the completed
 * history. Only work at the workflow's exit can be closed — the Done lane, or
 * whatever column sits last after a manager reshaped the board — and the same
 * people who may delete a task may close one (§7.6).
 */
export function closeTask(id, ctx = {}) {
  const index = store.findIndex((task) => task.id === id);
  if (index === -1) return notFound();
  const task = store[index];
  const ids = laneIds();
  const exitLane = ids[ids.length - 1];
  if (task.lane !== 'done' && task.lane !== exitLane) {
    return fail('not_done', 'Only a finished task can be closed.');
  }
  if (ctx.role === 'staff') {
    const byOwner = ctx.id != null && task.assignee?.id === ctx.id;
    const byReviewer = task.reviewer?.id === ctx.id;
    if (!byOwner && !byReviewer) {
      return fail('not_your_task', 'Only the owner or a reviewer can close this task.');
    }
  }
  task.closedAt = stamp();
  task.updatedAt = stamp();
  return { ok: true, record: clone(task) };
}


export function createTask({
  title,
  due,
  assigneeId,
  priority,
  description,
  lane,
  note,
  reviewerId,
  creator,
}) {
  const trimmed = title?.trim();
  if (!trimmed) return fail('title_required', 'A title is required.');
  if (due && !DATE_RE.test(due)) return fail('invalid_due', 'Due must be a calendar date.');
  if (priority !== undefined && priority !== null && !PRIORITIES.includes(priority)) {
    return fail('invalid_priority', 'Priority must be low, normal or high.');
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return fail('invalid_description', 'A description must be text.');
  }
  if (description && description.length > MAX_DESCRIPTION) {
    return fail('invalid_description', `Keep the description under ${MAX_DESCRIPTION} characters.`);
  }

  const targetLane = lane ?? 'todo';
  const assignee =
    assigneeId === undefined && creator
      ? { ok: true, person: { id: creator.id, name: creator.name, initials: creator.initials } }
      : personFor(assigneeId, 'unknown_assignee');
  if (!assignee.ok) return assignee;
  const reviewer = personFor(reviewerId, 'unknown_reviewer');
  if (!reviewer.ok) return reviewer;
  const ruled = checkLaneRules({ reviewer: reviewer.person }, targetLane, note);
  if (!ruled.ok) return ruled;

  const record = {
    id: `tsk_${Math.random().toString(36).slice(2, 8)}`,
    title: trimmed,
    description: description?.trim() ?? '',
    lane: targetLane,
    priority: priority ?? 'normal',
    assignee: assignee.person,
    reviewer: reviewer.person,
    due: due ?? null,
    note: note?.trim() || null,
    checklist: [],
    updatedAt: stamp(),
  };
  store.unshift(record);
  return { ok: true, record: clone(record) };
}

/** Lane → the status Home's task list shows (§12 parity between the views). */
export function statusOfLane(lane) {
  if (lane === 'done') return 'done';
  if (lane === 'todo') return 'todo';
  return 'in_progress';
}

/** The compact rows Home renders: open tasks due on the Nepal calendar day. */
export function listTasksDueToday() {
  const today = nepalIso();
  return store
    .filter((task) => task.due === today && task.lane !== 'done')
    .map(({ id, title, due, lane }) => ({ id, title, due, status: statusOfLane(lane) }));
}
