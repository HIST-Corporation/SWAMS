import { clone, fail, getTask, stamp } from './store.js';

/**
 * Checklist writes — the "to-do list" inside a task (contract request 22).
 * Split from the task store purely for file size; the rules and the
 * `{ok, record}` / `{ok, code, message}` answer shape are exactly the store's.
 */

const notFound = () => fail('not_found', 'That task no longer exists.');
const missingItem = () => fail('item_not_found', 'That checklist item no longer exists.');

/** Add a checklist item. */
export function addChecklistItem(id, text) {
  const task = getTask(id);
  if (!task) return notFound();
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return fail('text_required', 'Give the item a name.');
  task.checklist = [
    ...(task.checklist ?? []),
    { id: `chk_${Math.random().toString(36).slice(2, 8)}`, text: trimmed, done: false },
  ];
  task.updatedAt = stamp();
  return { ok: true, record: clone(task) };
}

/** Tick or untick one checklist item. */
export function setChecklistItem(id, itemId, done) {
  const task = getTask(id);
  if (!task) return notFound();
  const item = (task.checklist ?? []).find((row) => row.id === itemId);
  if (!item) return missingItem();
  item.done = Boolean(done);
  task.updatedAt = stamp();
  return { ok: true, record: clone(task) };
}

/** Remove one checklist item. */
export function removeChecklistItem(id, itemId) {
  const task = getTask(id);
  if (!task) return notFound();
  const before = (task.checklist ?? []).length;
  task.checklist = (task.checklist ?? []).filter((row) => row.id !== itemId);
  if (task.checklist.length === before) return missingItem();
  task.updatedAt = stamp();
  return { ok: true, record: clone(task) };
}
