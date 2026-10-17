/**
 * The draft ⇄ API-patch translation behind the task detail panel (§7.6).
 * Pure and DOM-free so it can be unit-tested on its own: the panel never sends
 * a field the person did not touch, and an emptied date or person is sent as
 * `null` (cleared), never as an empty string the API would have to guess about.
 */

export const PRIORITIES = ['low', 'normal', 'high'];

/** The editable shape of a task: what the panel reads and writes. */
export function toDraft(task) {
  return {
    title: task.title ?? '',
    description: task.description ?? '',
    priority: task.priority ?? 'normal',
    lane: task.lane ?? 'todo',
    due: task.due ?? '',
    assigneeId: task.assignee?.id ?? '',
    reviewerId: task.reviewer?.id ?? '',
    note: task.note ?? '',
  };
}

/** Only what actually changed, in the API's field names (empty string → null). */
export function toPatch(draft, task) {
  const before = toDraft(task);
  const patch = {};
  if (draft.title !== before.title) patch.title = draft.title.trim();
  if (draft.description !== before.description) patch.description = draft.description.trim();
  if (draft.priority !== before.priority) patch.priority = draft.priority;
  if (draft.lane !== before.lane) patch.lane = draft.lane;
  if (draft.due !== before.due) patch.due = draft.due || null;
  if (draft.assigneeId !== before.assigneeId) patch.assigneeId = draft.assigneeId || null;
  if (draft.reviewerId !== before.reviewerId) patch.reviewerId = draft.reviewerId || null;
  if (draft.note !== before.note) patch.note = draft.note.trim();
  return patch;
}
