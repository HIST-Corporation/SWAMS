import { api } from '../../lib/apiClient.js';

/**
 * Tasks API (Section 5: components never call fetch — hooks go through here).
 * Shapes are recorded in docs/api-contract/contract-requests.md (requests 11
 * and 22) and served by the labelled MSW store in `mocks/` until the real API
 * lands. Moves and edits are server-checked: the board mirrors the server's
 * record (and its rejection reason) rather than assuming success (§7.6).
 *
 * Every write answers with the whole updated `record`, so the client never
 * patches two copies of the same task out of step.
 */

/** The full board rows. */
export async function fetchTasks() {
  return (await api.get('/tasks')).data;
}

/**
 * Move a task to a lane. A move into Revision carries the push-back detail
 * (`suggestion`, `severity`) that appends to the history trail.
 * @param {{ id: string, lane: string, note?: string, suggestion?: string, severity?: string }} input
 */
export async function patchTaskLane({ id, lane, note, suggestion, severity }) {
  const body = { lane };
  if (note !== undefined) body.note = note;
  if (suggestion !== undefined) body.suggestion = suggestion;
  if (severity !== undefined) body.severity = severity;
  return (await api.patch(`/tasks/${encodeURIComponent(id)}`, body)).data;
}

/**
 * Create a task. Omitted `lane` starts it in To do; omitted `assigneeId`
 * means "the task is mine" (the server assigns the creator).
 * @param {{ title: string, lane?: string, priority?: string, description?: string, due?: string|null, assigneeId?: string, reviewerId?: string, note?: string }} input
 */
export async function createTask(input) {
  return (await api.post('/tasks', input)).data;
}

/**
 * Append a board column (manager/HR only; 403 `not_allowed` otherwise).
 * @param {{ name: string, wipLimit?: number|null }} input
 */
export async function createLane(input) {
  return (await api.post('/tasks/lanes', input)).data;
}

/**
 * Rename a column and/or set its WIP limit, and/or move its position on the
 * board (manager/HR only).
 * @param {{ id: string, patch: {name?: string, wipLimit?: number|null, index?: number} }} input
 */
export async function updateLane({ id, patch }) {
  return (await api.patch(`/tasks/lanes/${encodeURIComponent(id)}`, patch)).data;
}

/** Delete a board column. The column's tasks move to the first remaining
 * lane so nothing is lost (§7.6). Manager/HR only. */
/** Delete a task. Only the owner or a reviewer may delete it (manager/HR only
 * for the task itself, §7.6). */
export async function deleteTask(id) {
  return (await api.delete(`/tasks/${encodeURIComponent(id)}`)).data;
}

/** Close a finished task: it leaves the board's columns for the completed
 * history (server-checked: only Done/exit-lane work may be closed). */
export async function closeTask(id) {
  return (await api.post(`/tasks/${encodeURIComponent(id)}/close`)).data;
}


export async function deleteLane(id) {
  return (await api.delete(`/tasks/lanes/${encodeURIComponent(id)}`)).data;
}

/**
 * Edit a task's own fields and/or move its lane (contract request 22).
 * Only the keys present in `patch` change; `null` clears a date or a person.
 * @param {{ id: string, patch: {title?: string, description?: string, priority?: string, due?: string|null, assigneeId?: string|null, reviewerId?: string|null, lane?: string, note?: string} }} input
 */
export async function updateTask({ id, patch }) {
  return (await api.patch(`/tasks/${encodeURIComponent(id)}`, patch)).data;
}

/** Add one item to a task's checklist. */
export async function addChecklistItem({ id, text }) {
  return (await api.post(`/tasks/${encodeURIComponent(id)}/checklist`, { text })).data;
}

/** Tick or untick one checklist item. */
export async function setChecklistItem({ id, itemId, done }) {
  return (
    await api.patch(`/tasks/${encodeURIComponent(id)}/checklist/${encodeURIComponent(itemId)}`, {
      done,
    })
  ).data;
}

/** Remove one checklist item. */
export async function removeChecklistItem({ id, itemId }) {
  return (
    await api.delete(`/tasks/${encodeURIComponent(id)}/checklist/${encodeURIComponent(itemId)}`)
  ).data;
}

/** Fetch the available and owned board templates. */
export async function fetchTaskTemplates() {
  return (await api.get('/tasks/templates')).data;
}

/** Save a board snapshot as a personal template (manager/HR only). */
export async function createTaskTemplate(input) {
  return (await api.post('/tasks/templates', input)).data;
}

/** Choose a template to restart the board's columns. */
export async function applyTaskTemplate(templateId) {
  return (await api.post(`/tasks/templates/${encodeURIComponent(templateId)}/apply`)).data;
}

/** Delete a personal template (manager/HR only). */
export async function deleteTaskTemplate(id) {
  return (await api.delete(`/tasks/templates/${encodeURIComponent(id)}`)).data;
}
