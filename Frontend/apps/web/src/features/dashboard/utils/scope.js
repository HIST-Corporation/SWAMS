import { scopeFor } from '@swams/permissions';

/**
 * Which Home composition a session gets (six-role model, Section: dashboards):
 *
 *   org      organization-wide board — executive (owner), HR, department
 *            manager. Shows the KPI row, org trend, department bars, workforce
 *            panel, insights and the benchmark, all from `GET /org/dashboard`.
 *   team     team-scoped board — team lead / supervisor. Personal widgets plus
 *            the team presence strip and the corrections queue they can act
 *            on. NEVER the org-wide panels: a supervisor sees their team, not
 *            the company (contract request 30 scopes the data server-side).
 *   personal staff board — own hours, leave, tasks, punch.
 *
 * Built on the principal's data scope (`scopeFor`) so the mapping lives in one
 * place: organization and department scopes share the org composition today
 * (the department filter is a backend concern), team gets the team lens, and
 * anything else — including the platform scope, which never signs into the
 * workforce app — falls back to the personal board.
 *
 * @param {{ role?: string, scope?: string } | null} principal
 * @returns {'org'|'team'|'personal'}
 */
export function dashboardView(principal) {
  const scope = scopeFor(principal);
  if (scope === 'organization' || scope === 'department') return 'org';
  if (scope === 'team') return 'team';
  return 'personal';
}
