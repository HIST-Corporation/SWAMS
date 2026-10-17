import { ROSTER, personById } from '../../../mocks/fixtures.js';
import { nepalIso, nepalIsoDaysAgo } from '../utils/nepal.js';

/**
 * Canonical lanes (§7.6: To do → In progress → Review → Revision → Done), the
 * people tasks can be assigned to, and the board's column configuration.
 * MOCK source for the tasks store; the fixture cards live in `seedTasks.js`
 * and the seeded revision trail in `seedRevisions.js`, re-exported here so
 * consumers still reach for one module.
 *
 * The assignee picker reads the shared roster (`src/mocks/roster.js`), the same
 * 15 people the directory, the presence strip and each persona's pod show — so
 * a task card can never name somebody the rest of the product does not know.
 */

export const LANES = ['todo', 'in_progress', 'review', 'revision', 'done'];

/**
 * The board's column configuration ("slots"). The five workflow lanes always
 * exist and can only be renamed or given a WIP limit; a manager can append
 * further columns through `POST /tasks/lanes`. `name: null` keeps the standard
 * i18n label (`tasks:lanes.*`), `wipLimit: null` means no limit. WIP limits are
 * advisory: the header warns when a column is over, the server never traps
 * work in a lane.
 */
export const SEED_LANES = [
  { id: 'todo', name: null, wipLimit: 4 },
  { id: 'in_progress', name: null, wipLimit: 3 },
  { id: 'review', name: null, wipLimit: 3 },
  { id: 'revision', name: null, wipLimit: null },
  { id: 'done', name: null, wipLimit: null },
];

export const PEOPLE = ROSTER.map(({ id }) => {
  const person = personById(id);
  return { id, name: person.name, initials: person.initials };
});

/** Nepal calendar day as `YYYY-MM-DD` (§24: organizational day, not the browser's). */
export { nepalIso, nepalIsoDaysAgo };

export { SEED } from './seedTasks.js';
export { SEED_REVISIONS } from './seedRevisions.js';
