// @ts-check
/**
 * Canonical constants — single source for roles, permissions, scopes,
 * error codes and domain enums. Mirrors Frontend packages/permissions
 * (keys.js / scopes.js / bundles.js) — backend owns enforcement.
 */

/** Six-role model (contract request 30). */
export const ROLES = Object.freeze(['staff', 'team_lead', 'manager', 'hr', 'owner', 'super_admin']);

/** Canonical permission keys (Frontend packages/permissions keys.js). */
export const PERMISSIONS = Object.freeze([
  'attendance.read',
  'attendance.write',
  'attendance.approve',
  'attendance.correct',
  'leave.read',
  'leave.create',
  'leave.approve',
  'leave.configure',
  'tasks.read',
  'tasks.write',
  'tasks.manage',
  'projects.manage',
  'team.read',
  'team.manage',
  'users.manage',
  'roles.manage',
  'reports.read',
  'analytics.read',
  'settings.manage',
  'billing.manage',
  'audit.read',
  'ai.use',
  'meetings.manage',
  'messages.moderate',
]);

/** Data scopes — backend enforces on every request (contract request 30). */
export const DATA_SCOPES = Object.freeze(['self', 'team', 'department', 'organization', 'platform']);

export const SCOPE_BY_ROLE = Object.freeze({
  staff: 'self',
  team_lead: 'team',
  manager: 'department',
  hr: 'organization',
  owner: 'organization',
  super_admin: 'platform',
});

/** Default permission grants per role (server truth; UI bundles are cosmetic). */
export const ROLE_PERMISSIONS = Object.freeze({
  staff: ['attendance.read', 'attendance.write', 'leave.read', 'leave.create', 'tasks.read', 'tasks.write'],
  team_lead: [
    'attendance.read',
    'attendance.write',
    'attendance.approve',
    'leave.read',
    'leave.create',
    'leave.approve',
    'tasks.read',
    'tasks.write',
    'team.read',
    'reports.read',
  ],
  manager: [
    'attendance.read',
    'attendance.approve',
    'attendance.correct',
    'leave.read',
    'leave.approve',
    'tasks.read',
    'tasks.write',
    'tasks.manage',
    'projects.manage',
    'team.read',
    'team.manage',
    'reports.read',
    'analytics.read',
    'meetings.manage',
  ],
  hr: [
    'attendance.read',
    'attendance.approve',
    'attendance.correct',
    'leave.read',
    'leave.approve',
    'leave.configure',
    'tasks.read',
    'team.read',
    'team.manage',
    'users.manage',
    'reports.read',
    'analytics.read',
    'settings.manage',
    'audit.read',
    'meetings.manage',
    'messages.moderate',
  ],
  owner: [
    'attendance.read',
    'attendance.approve',
    'attendance.correct',
    'leave.read',
    'leave.approve',
    'leave.configure',
    'tasks.read',
    'tasks.manage',
    'projects.manage',
    'team.read',
    'team.manage',
    'users.manage',
    'roles.manage',
    'reports.read',
    'analytics.read',
    'settings.manage',
    'billing.manage',
    'audit.read',
    'ai.use',
    'meetings.manage',
    'messages.moderate',
  ],
  super_admin: ['users.manage', 'roles.manage', 'billing.manage', 'audit.read'],
});

/** Canonical AppError codes (must match docs/api/error-codes.md + frontend AppError). */
export const ERROR_CODES = Object.freeze([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'validation_failed',
  'invalid_month',
  'invalid_date',
  'invalid_range',
  'range_too_long',
  'invalid_type',
  'invalid_patch',
  'invalid_lane',
  'note_required',
  'reviewer_required',
  'title_required',
  'invalid_priority',
  'invalid_due',
  'unknown_assignee',
  'unknown_reviewer',
  'not_a_staff_board',
  'out_of_scope',
  'invalid_notification',
  'rate_limited',
  'internal',
]);

export const ATTENDANCE_STATUS = Object.freeze(['present', 'late', 'absent', 'half_day', 'leave', 'holiday']);
export const PRESENCE = Object.freeze(['in', 'late', 'leave', 'out']);
export const LEAVE_STATUS = Object.freeze(['pending', 'approved', 'rejected', 'cancelled']);
export const TASK_LANES = Object.freeze(['backlog', 'todo', 'in_progress', 'review', 'done']);
export const TASK_PRIORITY = Object.freeze(['high', 'medium', 'low']);
export const NOTIFICATION_KINDS = Object.freeze(['info', 'approval', 'call', 'system']);
export const CORRECTION_STATUS = Object.freeze(['pending', 'approved', 'rejected']);
