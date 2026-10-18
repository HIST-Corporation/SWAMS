/**
 * Canonical permission keys (Section 4.1). The server owns the truth; these keys
 * exist so navigation, route guards and UI guards share one vocabulary.
 */
export const PERMISSIONS = Object.freeze([
  'attendance.read',
  'attendance.write',
  'attendance.approve',
  'attendance.correct',
  'leave.read',
  'leave.create',
  'leave.approve',
  'leave.configure',
  'payroll.view',
  'payroll.manage',
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

export const ROLES = Object.freeze(['staff', 'team_lead', 'manager', 'hr', 'owner', 'super_admin']);

/** @param {string} key */
export const isPermission = (key) => PERMISSIONS.includes(key);
