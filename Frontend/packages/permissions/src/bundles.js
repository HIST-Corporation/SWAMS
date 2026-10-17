/**
 * Default permission bundles per business role (Section 4). Six core roles:
 * staff, team_lead (supervisor), manager (department), hr, owner (executive),
 * super_admin (platform — console app only).
 *
 * These are UX defaults for route/UI gating; the API always re-checks.
 *
 * SEPARATION OF AUTHORITY (deliberate, tested):
 *  - `owner` is the CEO/executive lens: it READS the whole organization
 *    (reports, analytics, attendance/leave trends) and owns billing, but it
 *    does not automatically receive people-administration (`users.manage`,
 *    `roles.manage`) or operational approvals — those stay with HR/managers.
 *  - `super_admin` is platform administration (console): accounts, roles,
 *    platform settings, billing and audit. It holds NO business-data
 *    permissions (attendance/leave/tasks/team/reports/analytics) — an
 *    administrator can unseat a user, not read their attendance. The console
 *    is a separate app and auth realm from apps/web.
 * @type {Record<string, readonly string[]>}
 */
export const ROLE_BUNDLES = Object.freeze({
  staff: [
    'attendance.read',
    'attendance.write',
    'leave.read',
    'leave.create',
    'tasks.read',
    'tasks.write',
    'team.read',
  ],
  team_lead: [
    // Own work plus the team lens: attendance and leave approvals for the
    // assigned team, task coordination, and team-level reports. No people
    // administration, no policy configuration, no org-wide analytics.
    'attendance.read',
    'attendance.write',
    'attendance.approve',
    'leave.read',
    'leave.create',
    'leave.approve',
    'tasks.read',
    'tasks.write',
    'tasks.manage',
    'team.read',
    'reports.read',
    'meetings.manage',
  ],
  manager: [
    'attendance.read',
    'attendance.write',
    'attendance.approve',
    'attendance.correct',
    'leave.read',
    'leave.create',
    'leave.approve',
    'tasks.read',
    'tasks.write',
    'tasks.manage',
    'projects.manage',
    'team.read',
    'team.manage',
    'reports.read',
    'meetings.manage',
  ],
  hr: [
    ...ROLE_BUNDLES_SAFE([
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
      'audit.read',
      'ai.use',
      'meetings.manage',
      'messages.moderate',
    ]),
  ],
  owner: [
    // Executive leadership: organization-wide visibility (read) plus org
    // settings and billing. Approvals, people-admin and moderation are
    // delegated to HR/managers — holding equity is not a permission slip.
    'attendance.read',
    'attendance.write',
    'leave.read',
    'leave.create',
    'tasks.read',
    'team.read',
    'reports.read',
    'analytics.read',
    'meetings.manage',
    'settings.manage',
    'billing.manage',
  ],
  super_admin: [
    // Platform administration only (console app). No business data.
    'users.manage',
    'roles.manage',
    'settings.manage',
    'billing.manage',
    'audit.read',
  ],
});

/** Helper kept trivial so the bundle literal above stays readable. */
function ROLE_BUNDLES_SAFE(keys) {
  return keys;
}
