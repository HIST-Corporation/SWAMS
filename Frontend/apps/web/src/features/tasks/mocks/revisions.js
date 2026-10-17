import { nepalIso } from '../utils/nepal.js';
import { SEED_REVISIONS } from './seeds.js';

/**
 * The revision history trail behind the board's `REVISION HISTORY TRAIL`
 * table (MOCK ONLY). Every push back — card button or keyboard move — appends
 * one row; the three seeds give the table something real on first load.
 * Newest first, like the prototype.
 */

const clone = (row) => ({ ...row });
const rows = SEED_REVISIONS.map(clone);

/** Restore the fixture trail (tests only). */
export function resetRevisions() {
  rows.length = 0;
  rows.push(...SEED_REVISIONS.map(clone));
}

/** Every revision row, newest first. */
export function listRevisions() {
  return rows.map(clone);
}

/**
 * Record one push back. `issue` is the note shown on the card, `reviewer` is
 * the person who pushed it back (falling back to the card's reviewer).
 *
 * @param {object} task the task being pushed back
 * @param {{issue?: string, suggestion?: string, severity?: string, reviewer?: string|null}} input
 */
export function pushRevision(task, { issue, suggestion = '', severity = 'major', reviewer } = {}) {
  const record = {
    id: `rev_${Math.random().toString(36).slice(2, 8)}`,
    taskId: task.id,
    taskTitle: task.title,
    issue: String(issue ?? '').trim() || task.note || '',
    suggestion: String(suggestion ?? '').trim(),
    severity: severity === 'minor' ? 'minor' : 'major',
    reviewer: reviewer || task.reviewer?.name || '—',
    date: nepalIso(),
  };
  rows.unshift(record);
  return clone(record);
}
