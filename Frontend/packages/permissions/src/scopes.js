/**
 * Conceptual data scopes (Section: role model). These describe HOW MUCH of the
 * organization a principal's session may read — a design framework the UI uses
 * for composition and messaging. They are NOT a security boundary: the backend
 * must enforce scope on every request (contract request 30).
 *
 *   self          the user's own records
 *   team          an assigned team
 *   department    an authorized department
 *   organization  the whole organization
 *   platform      platform configuration and administration (console only)
 */
export const DATA_SCOPES = Object.freeze([
  'self',
  'team',
  'department',
  'organization',
  'platform',
]);

/**
 * The default data scope per role. A principal may carry an explicit
 * `scope` (from the session payload) which wins over the role default.
 * @type {Record<string, string>}
 */
export const SCOPE_BY_ROLE = Object.freeze({
  staff: 'self',
  team_lead: 'team',
  manager: 'department',
  hr: 'organization',
  owner: 'organization',
  super_admin: 'platform',
});

/**
 * The data scope a principal operates in. Unknown or missing principals are
 * treated as `self` — the narrowest scope — never as an open default.
 * @param {{ role?: string, scope?: string } | null} principal
 * @returns {string} one of DATA_SCOPES
 */
export function scopeFor(principal) {
  const explicit = principal?.scope;
  if (explicit && DATA_SCOPES.includes(explicit)) return explicit;
  return SCOPE_BY_ROLE[principal?.role] ?? 'self';
}
