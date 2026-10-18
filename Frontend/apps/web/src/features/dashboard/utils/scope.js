import { scopeFor } from '@swams/permissions';

/**
 * Which Home composition a session gets (six-role model, Section: dashboards).
 *
 *   owner      executive aggregates — headcount, on-site rate, approvals inbox
 *              from `GET /dashboard/owner`.
 *   hr         HR action queue — pending leave/corrections, exceptions,
 *              from `GET /dashboard/hr`.
 *   manager    department capacity vs load, risks, team approvals
 *              from `GET /dashboard/manager`.
 *   team-lead  team workload, blockers, corrections queue
 *              from `GET /dashboard/team-lead`.
 *   team       team-scoped board — team lead / supervisor. Personal widgets plus
 *            the team presence strip and the corrections queue they can act
 *            on. NEVER the org-wide panels.
 *   personal   staff board — own hours, leave, tasks, punch.
 *
 * Built on the principal's role so each responsibility gets its own structure.
 * Falls back to the personal board for any unrecognised role.
 *
 * @param {{ role?: string, scope?: string } | null} principal
 * @returns {'owner'|'hr'|'manager'|'team-lead'|'team'|'personal'}
 */
export function dashboardView(principal) {
  if (!principal) return 'personal';
  const role = principal.role;
  if (role === 'owner') return 'owner';
  if (role === 'hr') return 'hr';
  if (role === 'manager') return 'manager';
  if (role === 'team_lead') return 'team-lead';
  const scope = scopeFor(principal);
  if (scope === 'team') return 'team';
  return 'personal';
}
