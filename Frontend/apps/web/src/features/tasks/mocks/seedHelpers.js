import { personById } from '../../../mocks/fixtures.js';

/**
 * Small builders the fixture board is assembled from (MOCK ONLY). Kept apart
 * from the seed data so each file stays readable and under the size budget.
 */

/** An ISO timestamp `days` ago — the fixture `updatedAt` values. */
export function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** `{ id, name, initials }` for a roster id, or a falsy value for an unknown one. */
export const byId = (id) =>
  personById(id) && { id, name: personById(id).name, initials: personById(id).initials };

/** `{ text, done }` fixtures → checklist items with stable ids at build time. */
export function checklist(taskId, rows) {
  return rows.map(([text, done], index) => ({ id: `${taskId}_c${index + 1}`, text, done }));
}
