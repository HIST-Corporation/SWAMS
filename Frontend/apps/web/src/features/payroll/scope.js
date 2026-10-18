import { can, scopeFor } from '@swams/permissions';

/**
 * Payroll scope lens (Section 4.1). ONE rule, used by the page to compose
 * itself and by the MSW handlers to refuse the same request server-side —
 * so the UI can never show a shape the API would deny.
 *
 *  - `organization` hr and owner sessions: org-wide reads. Only `payroll.manage`
 *    (HR) may run, decide or save anything — the owner reads (separation of
 *    authority, packages/permissions/src/bundles.js).
 *  - `self` everyone else with `payroll.view`: own compensation, payslips and
 *    claims only. Org-wide salary data never renders for a self session.
 *
 * @param {{ role?: string } | null} principal
 * @returns {'organization' | 'self'}
 */
export function payrollScope(principal) {
  if (!principal || !can(principal, 'payroll.view')) return 'self';
  return scopeFor(principal) === 'organization' ? 'organization' : 'self';
}

/** Writing payroll — processing runs, deciding claims, editing structures. */
export function canProcessPayroll(principal) {
  return can(principal, 'payroll.manage');
}
