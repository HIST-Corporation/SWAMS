import { describe, it, expect } from 'vitest';
import {
  can,
  grantedPermissions,
  PERMISSIONS,
  ROLES,
  ROLE_BUNDLES,
  scopeFor,
  DATA_SCOPES,
} from './index.js';

const staff = { id: 'u1', role: 'staff' };
const teamLead = { id: 'u2', role: 'team_lead' };
const manager = { id: 'u3', role: 'manager' };
const hr = { id: 'u4', role: 'hr' };
const owner = { id: 'u5', role: 'owner' };
const superAdmin = { id: 'u6', role: 'super_admin' };

describe('can()', () => {
  it('staff can punch and request leave but not approve', () => {
    expect(can(staff, 'attendance.write')).toBe(true);
    expect(can(staff, 'leave.create')).toBe(true);
    expect(can(staff, 'leave.approve')).toBe(false);
    expect(can(staff, 'settings.manage')).toBe(false);
  });

  it('team_lead approves team attendance/leave and manages tasks, but not people or policy', () => {
    expect(can(teamLead, 'attendance.approve')).toBe(true);
    expect(can(teamLead, 'leave.approve')).toBe(true);
    expect(can(teamLead, 'tasks.manage')).toBe(true);
    expect(can(teamLead, 'reports.read')).toBe(true);
    // A supervisor is not a people-admin or policy role.
    expect(can(teamLead, 'attendance.correct')).toBe(false);
    expect(can(teamLead, 'team.manage')).toBe(false);
    expect(can(teamLead, 'users.manage')).toBe(false);
    expect(can(teamLead, 'leave.configure')).toBe(false);
    expect(can(teamLead, 'analytics.read')).toBe(false);
    expect(can(teamLead, 'settings.manage')).toBe(false);
  });

  it('manager can approve leave and manage tasks but not billing', () => {
    expect(can(manager, 'leave.approve')).toBe(true);
    expect(can(manager, 'tasks.manage')).toBe(true);
    expect(can(manager, 'billing.manage')).toBe(false);
  });

  it('hr holds policy and people permissions; billing stays with the owner', () => {
    expect(can(hr, 'leave.configure')).toBe(true);
    expect(can(hr, 'roles.manage')).toBe(true);
    expect(can(hr, 'billing.manage')).toBe(false);
    expect(can(owner, 'billing.manage')).toBe(true);
  });

  // Payroll authority (module spec): HR processes, everyone else either reads
  // org-wide totals (owner) or their own payslips (staff). `payroll.manage`
  // is the only path to org-wide salary data.
  it('payroll: HR manages, the owner reads, staff see self-service only', () => {
    expect(can(hr, 'payroll.view')).toBe(true);
    expect(can(hr, 'payroll.manage')).toBe(true);
    expect(can(owner, 'payroll.view')).toBe(true);
    expect(can(owner, 'payroll.manage')).toBe(false);
    expect(can(staff, 'payroll.view')).toBe(true);
    expect(can(staff, 'payroll.manage')).toBe(false);
    expect(can(teamLead, 'payroll.manage')).toBe(false);
    expect(can(manager, 'payroll.manage')).toBe(false);
    // Platform administration holds no business data (console only).
    expect(can(superAdmin, 'payroll.view')).toBe(false);
  });

  // The six-role model's core guarantee: executive authority and platform
  // administration are separate axes. Neither implies the other.
  it('the executive (owner) does not receive people-admin or technical-admin permissions', () => {
    expect(can(owner, 'analytics.read')).toBe(true);
    expect(can(owner, 'reports.read')).toBe(true);
    expect(can(owner, 'settings.manage')).toBe(true);
    expect(can(owner, 'users.manage')).toBe(false);
    expect(can(owner, 'roles.manage')).toBe(false);
    expect(can(owner, 'audit.read')).toBe(false);
    expect(can(owner, 'attendance.approve')).toBe(false);
    expect(can(owner, 'leave.approve')).toBe(false);
  });

  it('super_admin holds platform administration but no business data', () => {
    expect(can(superAdmin, 'users.manage')).toBe(true);
    expect(can(superAdmin, 'roles.manage')).toBe(true);
    expect(can(superAdmin, 'billing.manage')).toBe(true);
    expect(can(superAdmin, 'audit.read')).toBe(true);
    // Super Admin is NOT the CEO: no attendance, leave, tasks, team,
    // reports or analytics.
    expect(can(superAdmin, 'attendance.read')).toBe(false);
    expect(can(superAdmin, 'leave.read')).toBe(false);
    expect(can(superAdmin, 'tasks.read')).toBe(false);
    expect(can(superAdmin, 'team.read')).toBe(false);
    expect(can(superAdmin, 'reports.read')).toBe(false);
    expect(can(superAdmin, 'analytics.read')).toBe(false);
  });

  it('explicit grants beat the role bundle', () => {
    const custom = { id: 'u7', role: 'staff', permissions: ['billing.manage'] };
    expect(can(custom, 'billing.manage')).toBe(true);
    expect(can(custom, 'attendance.write')).toBe(false);
  });

  it('explicit denials beat everything', () => {
    const denied = { id: 'u8', role: 'hr', denials: ['leave.approve'] };
    expect(can(denied, 'leave.approve')).toBe(false);
    expect(can(denied, 'leave.configure')).toBe(true);
  });

  it('resource rules: cannot approve your own leave; locked periods cannot be corrected here', () => {
    expect(can(manager, 'leave.approve', { requesterId: 'u3' })).toBe(false);
    expect(can(manager, 'leave.approve', { requesterId: 'someone-else' })).toBe(true);
    expect(can(teamLead, 'leave.approve', { requesterId: 'u2' })).toBe(false);
    expect(can(manager, 'attendance.correct', { locked: true })).toBe(false);
  });

  it('rejects unknown permission keys and missing principals', () => {
    expect(can(hr, 'not.a.permission')).toBe(false);
    expect(can(null, 'attendance.read')).toBe(false);
  });
});

describe('bundles', () => {
  it('every bundle member is a canonical key', () => {
    for (const keys of Object.values(ROLE_BUNDLES)) {
      for (const key of keys) expect(PERMISSIONS).toContain(key);
    }
  });

  it('has exactly one bundle per core role', () => {
    expect(Object.keys(ROLE_BUNDLES).sort()).toEqual([...ROLES].sort());
  });

  it('grantedPermissions reflects denials', () => {
    const p = { id: 'u9', role: 'staff', denials: ['attendance.write'] };
    expect(grantedPermissions(p)).not.toContain('attendance.write');
    expect(grantedPermissions(p)).toContain('leave.create');
  });
});

describe('data scopes', () => {
  it('maps each role to its default scope', () => {
    expect(scopeFor(staff)).toBe('self');
    expect(scopeFor(teamLead)).toBe('team');
    expect(scopeFor(manager)).toBe('department');
    expect(scopeFor(hr)).toBe('organization');
    expect(scopeFor(owner)).toBe('organization');
    expect(scopeFor(superAdmin)).toBe('platform');
  });

  it('an explicit session scope wins over the role default', () => {
    expect(scopeFor({ role: 'manager', scope: 'team' })).toBe('team');
    expect(scopeFor({ role: 'manager', scope: 'nonsense' })).toBe('department');
  });

  it('unknown or missing principals fall back to the narrowest scope', () => {
    expect(scopeFor(null)).toBe('self');
    expect(scopeFor({})).toBe('self');
    expect(scopeFor({ role: 'ghost' })).toBe('self');
    expect(DATA_SCOPES).toContain(scopeFor(staff));
  });
});
