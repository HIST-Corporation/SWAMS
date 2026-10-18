import { describe, it, expect } from 'vitest';
import { navState, visibleGroups, mobileTabs } from './nav-access.js';
import { NAV_ITEMS } from './nav.config.js';

const staff = { id: 'u1', role: 'staff' };
const hr = { id: 'u2', role: 'hr' };
const entitlements = ['attendance', 'leave', 'tasks'];

describe('navState', () => {
  it('hides features that have not shipped (Section 8.5 release gating)', () => {
    const projects = NAV_ITEMS.find((i) => i.id === 'projects');
    expect(navState(projects, hr, entitlements)).toBe('hidden');
  });

  it('shows the task board now that slice 8 has shipped it', () => {
    const tasks = NAV_ITEMS.find((i) => i.id === 'tasks');
    expect(navState(tasks, hr, entitlements)).toBe('allowed');
  });

  it('shows attendance now that slice 3 has shipped it', () => {
    const attendance = NAV_ITEMS.find((i) => i.id === 'attendance');
    expect(navState(attendance, hr, entitlements)).toBe('allowed');
  });

  it('hides attendance from a role without attendance.read', () => {
    const attendance = NAV_ITEMS.find((i) => i.id === 'attendance');
    expect(navState(attendance, { id: 'u9', role: 'nobody' }, entitlements)).toBe('hidden');
  });

  it('hides items whose permission the role lacks, shows them when granted', () => {
    const item = { enabled: true, requires: { permission: 'billing.manage' } };
    expect(navState(item, hr, entitlements)).toBe('hidden');
    expect(navState(item, { id: 'u3', role: 'owner' }, [])).toBe('allowed');
  });

  it('locks (never dead-links) items whose entitlement is missing', () => {
    const item = { enabled: true, requires: { permission: 'leave.read', entitlement: 'leave' } };
    expect(navState(item, hr, [])).toBe('locked');
    expect(navState(item, hr, ['leave'])).toBe('allowed');
  });

  it('shows always-on items to everyone', () => {
    const item = { enabled: true, requires: {} };
    expect(navState(item, staff, [])).toBe('allowed');
  });
});

describe('visibleGroups', () => {
  it('drops hidden items and removes groups that become empty', () => {
    const groups = visibleGroups(NAV_ITEMS, hr, entitlements);
    // `reports` + `analytics` (insights) + `settings` + `audit` (admin)
    // shipped: HR holds reports.read, analytics.read, settings.manage and
    // audit.read, so both groups appear. Payroll (R3.8) adds its own
    // top-level group — HR holds payroll.view and payroll.manage.
    expect(groups.map((g) => g.id)).toEqual([
      'overview',
      'work',
      'people',
      'payroll',
      'insights',
      'admin',
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(['dashboard', 'attendance']);
    expect(groups[3].items.map((i) => i.id)).toEqual(['payroll']);
    expect(groups[4].items.map((i) => i.id)).toEqual(['reports', 'analytics']);
    expect(groups[5].items.map((i) => i.id)).toEqual(['settings', 'audit']);
  });

  it('shows payroll to a view-only session and hides it without payroll.view', () => {
    const groups = visibleGroups(NAV_ITEMS, staff, entitlements);
    // staff holds payroll.view (self-service) — the group is present, but the
    // admin group stays hidden (no settings.manage).
    expect(groups.map((g) => g.id)).toContain('payroll');
    expect(groups.map((g) => g.id)).not.toContain('admin');
    const withoutPayroll = visibleGroups(NAV_ITEMS, { id: 'u9', role: 'nobody' }, entitlements);
    expect(withoutPayroll.map((g) => g.id)).not.toContain('payroll');
  });

  it('hides the admin group from a role without settings.manage', () => {
    const groups = visibleGroups(NAV_ITEMS, staff, entitlements);
    expect(groups.map((g) => g.id)).not.toContain('admin');
  });

  it('attaches the access state so the sidebar can render locked affordances', () => {
    const items = [
      {
        id: 'x',
        group: 'work',
        enabled: true,
        requires: { permission: 'leave.read', entitlement: 'leave' },
      },
    ];
    const groups = visibleGroups(items, hr, []);
    expect(groups[0].items[0].access).toBe('locked');
  });
});

describe('mobileTabs', () => {
  it('keeps only visible tabs, ordered Home → More (Section 8.4)', () => {
    const tabs = mobileTabs(NAV_ITEMS, hr, entitlements);
    expect(tabs.map((t) => t.id)).toEqual(['dashboard', 'attendance', 'tasks', 'leave', 'more']);
  });
});
