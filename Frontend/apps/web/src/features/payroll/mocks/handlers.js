import { http, HttpResponse } from 'msw';
import { isAuthorized, authState } from '../../auth/mocks/authState.js';
import { FIXTURES } from '../../../mocks/fixtures.js';
import { canProcessPayroll, payrollScope } from '../scope.js';
import {
  COMPENSATION,
  COMPONENTS,
  LOANS,
  PAY_PERIODS,
  PAYROLL_SETTINGS,
  PAYSLIPS,
  REIMBURSEMENTS,
  REPORT_COLUMNS,
  REPORT_TYPES,
  RUN,
  RUN_HISTORY,
  SALARY_HISTORY,
  SALARY_STRUCTURES,
  VARIABLE_INPUTS,
  deriveReport,
  payslipTotals,
  toCsv,
} from './fixtures.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

function requestId() {
  return `mock_${Math.random().toString(36).slice(2, 10)}`;
}

function error(status, code, message) {
  return HttpResponse.json({ code, message, requestId: requestId() }, { status });
}

/**
 * Who is asking — same session resolution as the tasks mock (one key decides
 * both role and identity), then the SHARED `../scope.js` rule: the UI and this
 * server-side mock apply one lens, so the page can never render a shape the
 * API would refuse.
 */
function sessionPrincipal() {
  const key = authState.sessionKey ?? 'hr';
  const session = FIXTURES.sessions[key] ?? FIXTURES.session;
  return session.principal ?? { role: 'hr' };
}

function sessionUser() {
  const key = authState.sessionKey ?? 'hr';
  const session = FIXTURES.sessions[key] ?? FIXTURES.session;
  return session.user ?? null;
}

/** 401 unless the bearer token the auth mock issued is present. */
function requireAuth(request) {
  return isAuthorized(request) ? null : error(401, 'unauthenticated', 'Sign in to continue.');
}

/** Organization-scope reads (hr + owner) — refused for self sessions. */
function requireOrgRead(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (payrollScope(sessionPrincipal()) !== 'organization') {
    return error(403, 'scope_denied', 'This session only sees its own payroll records.');
  }
  return null;
}

/** Writes: processing runs, deciding claims, editing structures/settings. */
function requireManage(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!canProcessPayroll(sessionPrincipal())) {
    return error(403, 'not_permitted', 'This action needs payroll.manage.');
  }
  return null;
}

/**
 * Mutable fixture store (MOCK ONLY). Mutations land here so the workspace,
 * the claims queue and the history can never fake a success the API never
 * gave — the same pattern as the leave mock's `store`.
 */
const store = {
  run: {
    ...RUN,
    exceptions: RUN.exceptions.map((row) => ({ ...row })),
    approvals: [...RUN.approvals],
  },
  history: RUN_HISTORY.map((row) => ({ ...row })),
  structures: SALARY_STRUCTURES.map((row) => ({ ...row, componentIds: [...row.componentIds] })),
  loans: LOANS.map((row) => ({ ...row })),
  reimbursements: REIMBURSEMENTS.map((row) => ({ ...row })),
  settings: JSON.parse(JSON.stringify(PAYROLL_SETTINGS)),
};

/** The forward actions per stage — a run advances one step at a time (§12.1). */
const NEXT_STAGE = {
  draft: { action: 'collect', next: 'inputs' },
  inputs: { action: 'startReview', next: 'review' },
  review: { action: 'sendApproval', next: 'approval' },
  approval: { action: 'approve', next: 'finalize' },
  finalize: { action: 'publish', next: 'publish' },
};

function pushHistory(entry) {
  store.history.unshift({
    id: `hist_${Math.random().toString(36).slice(2, 8)}`,
    runId: store.run.id,
    at: new Date().toISOString(),
    ...entry,
  });
}

/** Self rows for a session user id — the self lens every list shares. */
const ownCompensation = () => COMPENSATION.filter((row) => row.employee.id === sessionUser()?.id);
const ownPayslips = () => PAYSLIPS.filter((row) => row.employee.id === sessionUser()?.id);
const ownLoans = () => store.loans.filter((row) => row.employee.id === sessionUser()?.id);
const ownReimbursements = () =>
  store.reimbursements.filter((row) => row.employee.id === sessionUser()?.id);

/**
 * Payroll mock handlers (mock-first, R3.8). MOCK ONLY — there is no backend
 * payroll endpoint yet; the shapes here are what the UI asked for and are
 * asserted in `handlers.test.js`.
 *
 * Mock rules (documented, deterministic):
 *  - every route requires the bearer token the auth mock issued (401 else)
 *  - org-wide reads (run, structures, compensation?scope=org, reports,
 *    history) → 403 `scope_denied` for a self session; HR AND owner read
 *  - every write (transition, exception resolve, structure save, claim
 *    decisions, settings) → 403 `not_permitted` without `payroll.manage`
 *  - self rows are filtered by the session user id — never by a client param
 *  - the run advances one stage per action; guards return 422 with a code:
 *    `exceptions_open`, `note_required`, `confirm_required`, `invalid_transition`
 */
export const payrollHandlers = [
  // ── Periods (both lenses: labels only, no amounts) ──────────────────────
  http.get(`${API}/payroll/periods`, ({ request }) => {
    const denied = requireAuth(request);
    if (denied) return denied;
    return HttpResponse.json({ rows: PAY_PERIODS });
  }),

  // ── The run (organization read; the workspace composes from it) ─────────
  http.get(`${API}/payroll/run`, ({ request }) => {
    const denied = requireOrgRead(request);
    if (denied) return denied;
    const periodId = new URL(request.url).searchParams.get('periodId') ?? store.run.periodId;
    if (periodId !== store.run.periodId) {
      return HttpResponse.json({ run: null, history: [] });
    }
    return HttpResponse.json({ run: store.run, history: store.history.slice(0, 8) });
  }),

  // ── Run transition (manage; one stage per action, guarded) ──────────────
  http.post(`${API}/payroll/run/transition`, async ({ request }) => {
    const denied = requireManage(request);
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const step = NEXT_STAGE[store.run.stage];
    if (!step || action !== step.action) {
      return error(422, 'invalid_transition', `Stage "${store.run.stage}" does not accept that action.`);
    }
    // Review → approval is blocked while exceptions are open (§12.1).
    if (step.next === 'approval' && store.run.exceptions.length > 0) {
      return error(422, 'exceptions_open', 'Resolve every exception before requesting approval.');
    }
    // The approval step documents itself when the workflow requires a note.
    if (action === 'approve' && store.settings.workflow.requireApproval && !body?.note?.trim()) {
      return error(422, 'note_required', 'An approval note is required by the workflow policy.');
    }
    // Publishing is consequential: the client must confirm it explicitly.
    if (action === 'publish' && body?.confirm !== true) {
      return error(422, 'confirm_required', 'Confirm publishing before the run is locked.');
    }

    const actor = sessionUser();
    store.run.stage = step.next;
    store.run.updatedAt = new Date().toISOString();
    if (action === 'approve') {
      store.run.approvals.push({
        by: { id: actor?.id, name: actor?.name },
        note: body.note.trim(),
        at: store.run.updatedAt,
      });
    }
    if (action === 'publish') {
      store.run.periodStatus = 'published';
    }
    pushHistory({ stage: step.next, actor: { id: actor?.id, name: actor?.name, initials: actor?.initials }, note: action });
    return HttpResponse.json({ run: store.run });
  }),

  // ── Exception resolve (manage) ──────────────────────────────────────────
  http.post(`${API}/payroll/run/exceptions/:exceptionId`, ({ request, params }) => {
    const denied = requireManage(request);
    if (denied) return denied;
    const row = store.run.exceptions.find((ex) => ex.id === params.exceptionId);
    if (!row) return error(404, 'not_found', 'That exception no longer exists.');
    store.run.exceptions = store.run.exceptions.filter((ex) => ex.id !== params.exceptionId);
    return HttpResponse.json({ run: store.run });
  }),

  // ── Salary structures (org read; manage write) ──────────────────────────
  http.get(`${API}/payroll/structures`, ({ request }) => {
    const denied = requireOrgRead(request);
    if (denied) return denied;
    return HttpResponse.json({ rows: store.structures, components: COMPONENTS });
  }),

  http.post(`${API}/payroll/structures`, async ({ request }) => {
    const denied = requireManage(request);
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    if (!body?.name?.trim()) return error(422, 'name_required', 'A structure needs a name.');
    if (!body?.effectiveFrom) {
      return error(422, 'effective_from_required', 'An effective date is required.');
    }
    const componentIds = Array.isArray(body.componentIds) ? body.componentIds : [];
    const hasEarning = componentIds.some((id) =>
      COMPONENTS.find((c) => c.id === id)?.kind === 'earning',
    );
    if (componentIds.length === 0 || !hasEarning) {
      return error(422, 'earning_required', 'Keep at least one earning component.');
    }
    const record = {
      id: `st_${Math.random().toString(36).slice(2, 8)}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      effectiveFrom: body.effectiveFrom,
      componentIds,
      sample: true,
    };
    store.structures.unshift(record);
    return HttpResponse.json({ record }, { status: 201 });
  }),

  http.patch(`${API}/payroll/structures/:structureId`, async ({ request, params }) => {
    const denied = requireManage(request);
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    const row = store.structures.find((s) => s.id === params.structureId);
    if (!row) return error(404, 'not_found', 'That structure no longer exists.');
    if (body?.name !== undefined && !String(body.name).trim()) {
      return error(422, 'name_required', 'A structure needs a name.');
    }
    if (body?.componentIds !== undefined) {
      const hasEarning = body.componentIds.some((id) =>
        COMPONENTS.find((c) => c.id === id)?.kind === 'earning',
      );
      if (body.componentIds.length === 0 || !hasEarning) {
        return error(422, 'earning_required', 'Keep at least one earning component.');
      }
      row.componentIds = [...body.componentIds];
    }
    if (body?.name !== undefined) row.name = String(body.name).trim();
    if (body?.description !== undefined) row.description = String(body.description).trim();
    if (body?.effectiveFrom !== undefined) row.effectiveFrom = body.effectiveFrom;
    return HttpResponse.json({ record: row });
  }),

  // ── Compensation: self always, org for the organization lens ────────────
  http.get(`${API}/payroll/compensation`, ({ request }) => {
    const denied = requireAuth(request);
    if (denied) return denied;
    const scope = new URL(request.url).searchParams.get('scope') ?? 'self';
    if (scope === 'org') {
      if (payrollScope(sessionPrincipal()) !== 'organization') {
        return error(403, 'scope_denied', 'This session only sees its own payroll records.');
      }
      return HttpResponse.json({ rows: COMPENSATION, history: SALARY_HISTORY });
    }
    if (scope !== 'self') return error(422, 'invalid_scope', 'Scope must be "self" or "org".');
    return HttpResponse.json({ rows: ownCompensation(), history: SALARY_HISTORY.filter(
      (row) => row.employee.id === sessionUser()?.id,
    ) });
  }),

  // ── Payslips: own slips always; every slip for the organization lens ─────
  http.get(`${API}/payroll/payslips`, ({ request }) => {
    const denied = requireAuth(request);
    if (denied) return denied;
    const scope = new URL(request.url).searchParams.get('scope') ?? 'self';
    if (scope === 'org') {
      if (payrollScope(sessionPrincipal()) !== 'organization') {
        return error(403, 'scope_denied', 'This session only sees its own payroll records.');
      }
      return HttpResponse.json({ rows: PAYSLIPS });
    }
    if (scope !== 'self') return error(422, 'invalid_scope', 'Scope must be "self" or "org".');
    return HttpResponse.json({ rows: ownPayslips() });
  }),

  http.get(`${API}/payroll/payslips/:payslipId`, ({ request, params }) => {
    const denied = requireAuth(request);
    if (denied) return denied;
    const payslip = PAYSLIPS.find((row) => row.id === params.payslipId);
    if (!payslip) return error(404, 'not_found', 'That payslip no longer exists.');
    const isOwn = payslip.employee.id === sessionUser()?.id;
    if (!isOwn && payrollScope(sessionPrincipal()) !== 'organization') {
      return error(403, 'scope_denied', 'This session only sees its own payslips.');
    }
    return HttpResponse.json({ payslip: { ...payslip, totals: payslipTotals(payslip) } });
  }),

  // ── Loans: list (scoped), request (self), decide (manage) ───────────────
  http.get(`${API}/payroll/loans`, ({ request }) => {
    const denied = requireAuth(request);
    if (denied) return denied;
    const scope = new URL(request.url).searchParams.get('scope') ?? 'self';
    if (scope === 'org') {
      if (payrollScope(sessionPrincipal()) !== 'organization') {
        return error(403, 'scope_denied', 'This session only sees its own payroll records.');
      }
      return HttpResponse.json({ rows: store.loans });
    }
    if (scope !== 'self') return error(422, 'invalid_scope', 'Scope must be "self" or "org".');
    return HttpResponse.json({ rows: ownLoans() });
  }),
];
