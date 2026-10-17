import { describe, it, expect } from 'vitest';
import { dashboardView } from './scope.js';

/**
 * The six-role dashboard contract: each role lands on the composition its data
 * scope justifies. These are the frontend's UX gates; the backend must still
 * scope every payload (contract request 30).
 */
describe('dashboardView', () => {
  it('organization scopes (executive, HR) get the org board', () => {
    expect(dashboardView({ role: 'owner' })).toBe('org');
    expect(dashboardView({ role: 'hr' })).toBe('org');
  });

  it('a department manager gets the org composition (department filter is server-side)', () => {
    expect(dashboardView({ role: 'manager' })).toBe('org');
  });

  it('a team lead gets the team board, never the org-wide panels', () => {
    expect(dashboardView({ role: 'team_lead' })).toBe('team');
  });

  it('staff get the personal board', () => {
    expect(dashboardView({ role: 'staff' })).toBe('personal');
  });

  it('the platform admin scope never signs into the workforce app — falls back to personal', () => {
    expect(dashboardView({ role: 'super_admin' })).toBe('personal');
  });

  it('an explicit session scope wins; unknown or missing principals get personal', () => {
    expect(dashboardView({ role: 'hr', scope: 'team' })).toBe('team');
    expect(dashboardView({ role: 'manager', scope: 'self' })).toBe('personal');
    expect(dashboardView(null)).toBe('personal');
    expect(dashboardView({ role: 'ghost' })).toBe('personal');
  });
});
