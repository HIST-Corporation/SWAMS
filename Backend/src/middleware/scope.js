// @ts-check
/**
 * Data-scope enforcement (contract request 30 — server owns the truth).
 * Derives scope from session principal: hr/owner → organization,
 * manager → department, team_lead → team, staff → self.
 * Helpers build Prisma `where` fragments; out-of-scope reads → 403 out_of_scope.
 */
import { forbidden } from '../common/errors.js';
import { SCOPE_BY_ROLE } from '../config/constants.js';

/** @param {{ role?: string, scope?: string } | null} principal */
export function scopeFor(principal) {
  const explicit = principal?.scope;
  if (explicit && ['self', 'team', 'department', 'organization', 'platform'].includes(explicit)) {
    return explicit;
  }
  return SCOPE_BY_ROLE[principal?.role] ?? 'self';
}

/**
 * Build an org-scoped Prisma where clause plus role narrowing.
 * Staff sees own rows; team_lead sees team members; manager sees department;
 * hr/owner see the whole org. Callers pass the field mapping for their model.
 *
 * @param {{ userId: string, orgId: string, role: string, teamIds?: string[], departmentId?: string | null }} principal
 * @param {{ userField?: string, teamField?: string|null, departmentField?: string|null }} [fields]
 */
export function scopedWhere(principal, fields = {}) {
  const { userField = 'userId', teamField = null, departmentField = null } = fields;
  const base = { orgId: principal.orgId };
  const scope = scopeFor(principal);
  if (scope === 'organization') return base;
  if (scope === 'self') return { ...base, [userField]: principal.userId };
  if (scope === 'team' && teamField && Array.isArray(principal.teamIds)) {
    return { ...base, [teamField]: { in: principal.teamIds } };
  }
  if (scope === 'department' && departmentField && principal.departmentId) {
    return { ...base, [departmentField]: principal.departmentId };
  }
  // Fallback to narrowest scope — never open by default.
  return { ...base, [userField]: principal.userId };
}

/** Guard: throw 403 out_of_scope when a principal asks beyond their scope. */
export function assertInScope(principal, target) {
  const scope = scopeFor(principal);
  if (scope === 'organization' || scope === 'platform') return;
  if (scope === 'self' && target.userId && target.userId !== principal.userId) {
    throw forbidden('out_of_scope', 'Requested resource is outside your data scope');
  }
}
