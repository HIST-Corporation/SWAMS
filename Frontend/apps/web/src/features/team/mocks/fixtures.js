/**
 * Team directory fixtures (MOCK ONLY). The whole roster — Himal Digital Pvt.
 * Ltd. people — the same ids, names and initials as the attendance team board
 * and the presence payload, because all three read `src/mocks/roster.js`
 * (§8.8, Section 7.6). Never presented as production data.
 */
import { ROSTER, personById } from '../../../mocks/fixtures.js';

export const TEAM_MEMBERS = ROSTER.map(({ id, roleKey, dept, online, openTasks }) => ({
  id,
  name: personById(id).name,
  roleKey,
  dept,
  status: online,
  tasks: openTasks,
}));

/** Department ids for the filter — labels come from i18n, never rendered raw. */
export const DEPARTMENTS = ['engineering', 'hr', 'design', 'marketing', 'finance', 'support'];
