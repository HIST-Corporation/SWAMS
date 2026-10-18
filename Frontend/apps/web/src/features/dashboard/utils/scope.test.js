import { describe, it, expect } from 'vitest';
import { dashboardView } from './scope.js';

/**
 * The six-role dashboard contract: each role lands on the composition its
 * responsibilities justify. These are the frontend's UX gates; the backend
 * must still scope every payload (contract request 30).
 */
describe('dashboardView', () => {
  it('owner gets the owner aggregates board', () => {
    expect(dashboardView({ role: 'owner' })).toBe('owner');
  });

  it('hr gets the HR action queue board', () => {
    expect(dashboardView({ role: 'hr' })).toBe('hr');
  });

  it('manager gets the department board', () => {
    expect(dashboardView({ role: 'manager' })).toBe('manager');
  });

  it('team lead gets the team-lead board, never the org-wide panels', () => {
    expect(dashboardView({ role: 'team_lead' })).toBe('team-lead');
  });

  it('staff get the personal board', () => {
    expect(dashboardView({ role: 'staff' })).toBe('personal');
  });

  it('the platform admin scope never signs into the workforce app — falls back to personal', () => {
    expect(dashboardView({ role: 'super_admin' })).toBe('personal');
  });

  it('an explicit session scope wins for non-mapped roles; unknown or missing principals get personal', () => {
    expect(dashboardView({ role: 'staff', scope: 'team' })).toBe('team');
    expect(dashboardView({ role: 'staff', scope: 'self' })).toBe('personal');
    expect(dashboardView(null)).toBe('personal');
    expect(dashboardView({ role: 'ghost' })).toBe('personal');
  });
});
