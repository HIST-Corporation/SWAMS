import { ROLE_BUNDLES } from './bundles.js';
import { isPermission } from './keys.js';

/**
 * @typedef {object} Principal
 * @property {string} role           one of ROLES
 * @property {string[]} [permissions] explicit grants from the session payload (win over role)
 * @property {string[]} [denials]    explicit denials (win over everything)
 * @property {string} [id]
 */

/**
 * Resource rules the UI can evaluate locally (Section 4.1, "scope lens").
 * Kept intentionally small: anything security-relevant stays on the server.
 */
const RESOURCE_RULES = {
  // You approve your own leave only when policy says so — default: no.
  'leave.approve': (principal, resource) => !resource || resource.requesterId !== principal.id,
  // Corrections on locked periods need HR — the UI only hints at it.
  'attendance.correct': (_principal, resource) => !resource || resource.locked !== true,
};

/**
 * Frontend authorization check (UX only — the server is the real gate, Section 4.1).
 * @param {Principal} principal
 * @param {string} permission
 * @param {object} [resource]
 * @returns {boolean}
 */
export function can(principal, permission, resource) {
  if (!principal) return false;
  if (!isPermission(permission)) return false;

  const denials = principal.denials ?? [];
  if (denials.includes(permission)) return false;

  const explicit = principal.permissions;
  const granted = explicit && explicit.length > 0 ? explicit : (ROLE_BUNDLES[principal.role] ?? []);
  if (!granted.includes(permission)) return false;

  const rule = RESOURCE_RULES[permission];
  return rule ? rule(principal, resource) === true : true;
}

/**
 * The effective grant list for a principal (used by nav config rendering).
 * @param {Principal} principal
 * @returns {readonly string[]}
 */
export function grantedPermissions(principal) {
  if (!principal) return [];
  const explicit = principal.permissions;
  const base = explicit && explicit.length > 0 ? explicit : (ROLE_BUNDLES[principal.role] ?? []);
  const denials = principal.denials ?? [];
  return base.filter((k) => !denials.includes(k));
}
