/**
 * Payroll fixtures (MOCK ONLY). Himal Digital Pvt. Ltd. — the same people ids
 * as the roster, attendance and leave fixtures (§8.8) so no two screens ever
 * disagree about who exists.
 *
 * Every money figure, structure and statutory-looking rate below is SAMPLE
 * CONFIGURATION for the demo org — never verified tax advice and never
 * presented as production data (§12.1: PreviewNotice is mandatory on the
 * page). Rates are round demo numbers on purpose; the `sampleNote` copy in
 * `payroll.json` tells the operator to replace them.
 */
import { personById } from '../../../mocks/fixtures.js';

/** Resolve a roster id to the row payroll screens show. */
function person(id) {
  const p = personById(id);
  return { id: p.id, name: p.name, initials: p.initials };
}

/** Pay periods — AD labels; BS conversion arrives with a verified converter. */
export const PAY_PERIODS = [
  {
    id: '2026-08',
    label: 'August 2026',
    start: '2026-08-01',
    end: '2026-08-31',
    payDate: '2026-09-07',
    status: 'closed',
  },
  {
    id: '2026-09',
    label: 'September 2026',
    start: '2026-09-01',
    end: '2026-09-30',
    payDate: '2026-10-07',
    status: 'published',
  },
  {
    id: '2026-10',
    label: 'October 2026',
    start: '2026-10-01',
    end: '2026-10-31',
    payDate: '2026-11-07',
    status: 'open',
  },
];

/** The pay run being processed (the open period). Stage: review (3 of 6). */
export const RUN = {
  id: 'run_2026_10',
  periodId: '2026-10',
  // 'draft' | 'inputs' | 'review' | 'approval' | 'finalize' | 'publish'
  stage: 'review',
  updatedAt: '2026-10-16T09:15:00+05:45',
  // Demo totals (sample): 10 people, round numbers on purpose.
  totals: {
    headcount: 10,
    gross: 1090000,
    deductions: 141700,
    net: 948300,
    employerContributions: 133000,
  },
  // Two blocking exceptions keep review → approval honest (§12.1).
  exceptions: [
    {
      id: 'ex_1',
      employee: person('u_prakash'),
      code: 'missing_bank_account',
      message: 'Bank account number is missing for this employee.',
    },
    {
      id: 'ex_2',
      employee: person('u_sunita'),
      code: 'unpaid_absence_unapproved',
      message: 'Unpaid absence (2 days) needs manager approval before the run advances.',
    },
  ],
  approvals: [],
};

/** Published run history — what the History tab and audit list read. */
export const RUN_HISTORY = [
  {
    id: 'hist_1',
    runId: 'run_2026_10',
    stage: 'review',
    actor: person('u_sarah'),
    note: 'Inputs collected; two exceptions raised.',
    at: '2026-10-16T09:15:00+05:45',
  },
  {
    id: 'hist_2',
    runId: 'run_2026_10',
    stage: 'inputs',
    actor: person('u_sita'),
    note: 'Variable inputs imported from attendance.',
    at: '2026-10-14T11:40:00+05:45',
  },
  {
    id: 'hist_3',
    runId: 'run_2026_09',
    stage: 'publish',
    actor: person('u_sarah'),
    note: 'September payslips published.',
    at: '2026-10-05T16:05:00+05:45',
  },
];

/**
 * Salary structures. `basis`: 'fixed' | 'percent' (of basic). Every percent is
 * demo configuration — the UI shows `structures.sampleNote` beside them.
 */
export const COMPONENTS = [
  { id: 'c_basic', code: 'basic', nameKey: 'basic', kind: 'earning', basis: 'fixed' },
  { id: 'c_hra', code: 'hra', nameKey: 'hra', kind: 'earning', basis: 'percent', percent: 40 },
  { id: 'c_festival', code: 'festival', nameKey: 'festival', kind: 'earning', basis: 'percent', percent: 8.33 },
  { id: 'c_pf_ee', code: 'pf_employee', nameKey: 'pfEmployee', kind: 'deduction', basis: 'percent', percent: 10 },
  { id: 'c_pf_er', code: 'pf_employer', nameKey: 'pfEmployer', kind: 'employer', basis: 'percent', percent: 10 },
  { id: 'c_cit', code: 'cit', nameKey: 'cit', kind: 'deduction', basis: 'percent', percent: 10 },
  { id: 'c_tax', code: 'income_tax', nameKey: 'incomeTax', kind: 'deduction', basis: 'percent', percent: 5 },
];

export const SALARY_STRUCTURES = [
  {
    id: 'st_standard',
    name: 'Standard salaried',
    description: 'Monthly salaried contract — basic plus HRA, PF and CIT.',
    effectiveFrom: '2026-07-16',
    componentIds: ['c_basic', 'c_hra', 'c_pf_ee', 'c_pf_er', 'c_cit'],
    sample: true,
  },
  {
    id: 'st_probation',
    name: 'Probation (6 months)',
    description: 'Probationary terms — basic only, no employer PF until confirmation.',
    effectiveFrom: '2026-07-16',
    componentIds: ['c_basic', 'c_tax'],
    sample: true,
  },
  {
    id: 'st_contract',
    name: 'Fixed contract',
    description: 'Fixed monthly contract with flat deductions.',
    effectiveFrom: '2026-08-01',
    componentIds: ['c_basic', 'c_festival', 'c_cit'],
    sample: true,
  },
];

/** Pay groups (Settings): who is paid on which cycle. */
export const PAY_GROUPS = [
  { id: 'pg_monthly', name: 'Monthly salaried', frequency: 'monthly', payDay: 7, headcount: 8 },
  { id: 'pg_contract', name: 'Contract monthly', frequency: 'monthly', payDay: 15, headcount: 2 },
];

/** Variable inputs for the open run (from attendance — never computed here). */
export const VARIABLE_INPUTS = [
  { id: 'vi_1', employee: person('u_anita'), type: 'overtime_hours', value: 6, periodId: '2026-10' },
  { id: 'vi_2', employee: person('u_james'), type: 'overtime_hours', value: 4.5, periodId: '2026-10' },
  { id: 'vi_3', employee: person('u_sunita'), type: 'unpaid_absence_days', value: 2, periodId: '2026-10' },
  { id: 'vi_4', employee: person('u_raj'), type: 'festival_bonus', value: 15000, periodId: '2026-10' },
];

/**
 * Employee compensation assignments (organization scope). Basic amounts are
 * sample NPR figures for the demo org — lakh-grouped on screen (§8.8).
 */
export const COMPENSATION = [
  { employee: person('u_sarah'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 145000, effectiveFrom: '2025-04-16' },
  { employee: person('u_sita'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 78000, effectiveFrom: '2025-09-01' },
  { employee: person('u_ramesh'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 165000, effectiveFrom: '2024-11-01' },
  { employee: person('u_anita'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 98000, effectiveFrom: '2025-02-16' },
  { employee: person('u_priya'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 72000, effectiveFrom: '2025-07-16' },
  { employee: person('u_james'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 92000, effectiveFrom: '2024-08-16' },
  { employee: person('u_prakash'), structureId: 'st_contract', payGroupId: 'pg_contract', basic: 88000, effectiveFrom: '2026-08-01' },
  { employee: person('u_tina'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 68000, effectiveFrom: '2025-12-16' },
  { employee: person('u_sunita'), structureId: 'st_probation', payGroupId: 'pg_contract', basic: 55000, effectiveFrom: '2026-09-16' },
  { employee: person('u_raj'), structureId: 'st_standard', payGroupId: 'pg_monthly', basic: 105000, effectiveFrom: '2024-10-16' },
];

/** Dated salary history per employee (the timeline in the Compensation tab). */
export const SALARY_HISTORY = [
  {
    id: 'sh_1',
    employee: person('u_anita'),
    date: '2026-07-16',
    from: 92000,
    to: 98000,
    reason: 'Annual revision (sample).',
    approvedBy: person('u_sarah'),
  },
  {
    id: 'sh_2',
    employee: person('u_anita'),
    date: '2025-02-16',
    from: 85000,
    to: 92000,
    reason: 'Promotion to team lead (sample).',
    approvedBy: person('u_ramesh'),
  },
  {
    id: 'sh_3',
    employee: person('u_priya'),
    date: '2026-07-16',
    from: 68000,
    to: 72000,
    reason: 'Annual revision (sample).',
    approvedBy: person('u_sarah'),
  },
  {
    id: 'sh_4',
    employee: person('u_sarah'),
    date: '2026-07-16',
    from: 138000,
    to: 145000,
    reason: 'Annual revision (sample).',
    approvedBy: person('u_aarav'),
  },
];

/**
 * Payslips — published periods only (drafts appear after the run publishes).
 * `lines` mirror what the payslip preview prints; totals reconcile with the
 * line items (handlers.test.js asserts it).
 */
export const PAYSLIPS = [
  {
    id: 'ps_202609_sarah',
    periodId: '2026-09',
    employee: person('u_sarah'),
    structureId: 'st_standard',
    status: 'published',
    earnings: [
      { code: 'basic', amount: 145000 },
      { code: 'hra', amount: 58000 },
    ],
    deductions: [
      { code: 'pf_employee', amount: 14500 },
      { code: 'cit', amount: 14500 },
      { code: 'income_tax', amount: 7250 },
    ],
    employer: [{ code: 'pf_employer', amount: 14500 }],
    publishedAt: '2026-10-05T16:05:00+05:45',
  },
  {
    id: 'ps_202609_anita',
    periodId: '2026-09',
    employee: person('u_anita'),
    structureId: 'st_standard',
    status: 'published',
    earnings: [
      { code: 'basic', amount: 98000 },
      { code: 'hra', amount: 39200 },
    ],
    deductions: [
      { code: 'pf_employee', amount: 9800 },
      { code: 'cit', amount: 9800 },
      { code: 'income_tax', amount: 4900 },
    ],
    employer: [{ code: 'pf_employer', amount: 9800 }],
    publishedAt: '2026-10-05T16:05:00+05:45',
  },
  {
    id: 'ps_202609_priya',
    periodId: '2026-09',
    employee: person('u_priya'),
    structureId: 'st_standard',
    status: 'published',
    earnings: [
      { code: 'basic', amount: 72000 },
      { code: 'hra', amount: 28800 },
    ],
    deductions: [
      { code: 'pf_employee', amount: 7200 },
      { code: 'cit', amount: 7200 },
      { code: 'income_tax', amount: 3600 },
    ],
    employer: [{ code: 'pf_employer', amount: 7200 }],
    publishedAt: '2026-10-05T16:05:00+05:45',
  },
  {
    id: 'ps_202609_james',
    periodId: '2026-09',
    employee: person('u_james'),
    structureId: 'st_standard',
    status: 'published',
    earnings: [
      { code: 'basic', amount: 92000 },
      { code: 'hra', amount: 36800 },
    ],
    deductions: [
      { code: 'pf_employee', amount: 9200 },
      { code: 'cit', amount: 9200 },
      { code: 'income_tax', amount: 4600 },
    ],
    employer: [{ code: 'pf_employer', amount: 9200 }],
    publishedAt: '2026-10-05T16:05:00+05:45',
  },
  {
    id: 'ps_202608_priya',
    periodId: '2026-08',
    employee: person('u_priya'),
    structureId: 'st_standard',
    status: 'published',
    earnings: [
      { code: 'basic', amount: 72000 },
      { code: 'hra', amount: 28800 },
    ],
    deductions: [
      { code: 'pf_employee', amount: 7200 },
      { code: 'cit', amount: 7200 },
      { code: 'income_tax', amount: 3600 },
    ],
    employer: [{ code: 'pf_employer', amount: 7200 }],
    publishedAt: '2026-09-07T15:30:00+05:45',
  },
];

/** Employee loans — active, pending approval, and settled (schedule history). */
export const LOANS = [
  {
    id: 'loan_1',
    employee: person('u_james'),
    principal: 200000,
    installment: 16667,
    outstanding: 133336,
    nextDue: '2026-11-07',
    status: 'active',
    takenOn: '2026-04-07',
    remaining: 8,
  },
  {
    id: 'loan_2',
    employee: person('u_priya'),
    principal: 100000,
    installment: 8334,
    outstanding: 75006,
    nextDue: '2026-11-07',
    status: 'active',
    takenOn: '2026-07-07',
    remaining: 9,
  },
  {
    id: 'loan_3',
    employee: person('u_tina'),
    principal: 60000,
    installment: 10000,
    outstanding: 60000,
    nextDue: '—',
    status: 'pending',
    takenOn: '2026-10-12',
    remaining: 6,
  },
  {
    id: 'loan_4',
    employee: person('u_raj'),
    principal: 80000,
    installment: 6667,
    outstanding: 0,
    nextDue: '—',
    status: 'settled',
    takenOn: '2025-06-07',
    remaining: 0,
  },
];

/** Reimbursement claims — self-submitted, HR-decided. */
export const REIMBURSEMENTS = [
  {
    id: 're_1',
    employee: person('u_anita'),
    category: 'travel',
    amount: 4200,
    spentOn: '2026-10-08',
    note: 'Lalitpur → Baneshwor client visit (sample).',
    status: 'pending',
    submittedAt: '2026-10-09',
  },
  {
    id: 're_2',
    employee: person('u_priya'),
    category: 'equipment',
    amount: 12500,
    spentOn: '2026-10-03',
    note: 'Ergonomic keyboard (sample).',
    status: 'pending',
    submittedAt: '2026-10-04',
  },
  {
    id: 're_3',
    employee: person('u_priya'),
    category: 'medical',
    amount: 3500,
    spentOn: '2026-09-21',
    note: 'Clinic visit (sample).',
    status: 'approved',
    submittedAt: '2026-09-22',
    decidedBy: person('u_sarah'),
    decidedAt: '2026-09-23',
  },
  {
    id: 're_4',
    employee: person('u_prakash'),
    category: 'travel',
    amount: 9800,
    spentOn: '2026-09-18',
    note: 'Pokhara site trip (sample).',
    status: 'rejected',
    submittedAt: '2026-09-19',
    decidedBy: person('u_sarah'),
    decidedAt: '2026-09-20',
    decisionNote: 'Receipt missing — resubmit with the ticket (sample).',
  },
];

/** Payroll settings (sample configuration — Settings tab). */
export const PAYROLL_SETTINGS = {
  payGroups: PAY_GROUPS,
  frequency: 'monthly',
  payDay: 7,
  fiscalYearStart: '07-16',
  currency: 'NPR',
  workflow: {
    requireApproval: true,
    autoLockOnPublish: true,
  },
  sample: true,
};

/** Sum one payslip's line items — the preview and the API must agree (§7.6). */
export function payslipTotals(payslip) {
  const sum = (lines) => lines.reduce((total, line) => total + line.amount, 0);
  const gross = sum(payslip.earnings);
  const deductions = sum(payslip.deductions);
  const employerContributions = sum(payslip.employer);
  return { gross, deductions, net: gross - deductions, employerContributions };
}

export const REPORT_TYPES = ['register', 'deductions', 'overtime', 'loans', 'reimbursements'];

/** RFC-4180 quoting — machine keys for headers, never localized text. */
export function toCsv(columns, rows) {
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.join(','), ...rows.map((row) => columns.map((c) => escape(row[c])).join(','))].join('\r\n');
}

/**
 * Report rows for one type (pure — the on-screen table and the CSV endpoint
 * read the same source, so the download can never disagree with the table).
 * @param {'register'|'deductions'|'overtime'|'loans'|'reimbursements'} type
 */
export function deriveReport(type) {
  if (type === 'register') {
    return COMPENSATION.map((row) => {
      const structure = SALARY_STRUCTURES.find((s) => s.id === row.structureId);
      const payslip = PAYSLIPS.find(
        (ps) => ps.periodId === '2026-09' && ps.employee.id === row.employee.id,
      );
      const totals = payslip ? payslipTotals(payslip) : { gross: row.basic, deductions: 0, net: row.basic };
      return {
        employee: row.employee.name,
        period: '2026-09',
        structure: structure?.name ?? '—',
        gross: totals.gross,
        deductions: totals.deductions,
        net: totals.net,
      };
    });
  }
  if (type === 'deductions') {
    return COMPENSATION.map((row) => {
      const payslip = PAYSLIPS.find(
        (ps) => ps.periodId === '2026-09' && ps.employee.id === row.employee.id,
      );
      return {
        employee: row.employee.name,
        period: '2026-09',
        deductions: payslip ? payslipTotals(payslip).deductions : 0,
      };
    });
  }
  if (type === 'overtime') {
    return VARIABLE_INPUTS.filter((input) => input.type === 'overtime_hours').map((input) => ({
      employee: input.employee.name,
      period: input.periodId,
      overtimeHours: input.value,
      overtimePay: input.value * 950, // sample hourly rate — demo only
    }));
  }
  if (type === 'loans') {
    return LOANS.map((loan) => ({
      employee: loan.employee.name,
      principal: loan.principal,
      outstanding: loan.outstanding,
      nextDue: loan.nextDue,
      status: loan.status,
    }));
  }
  return REIMBURSEMENTS.map((claim) => ({
    employee: claim.employee.name,
    category: claim.category,
    amount: claim.amount,
    status: claim.status,
  }));
}

/** CSV column keys per report type (machine keys — asserted in handlers.test). */
export const REPORT_COLUMNS = {
  register: ['employee', 'period', 'structure', 'gross', 'deductions', 'net'],
  deductions: ['employee', 'period', 'deductions'],
  overtime: ['employee', 'period', 'overtimeHours', 'overtimePay'],
  loans: ['employee', 'principal', 'outstanding', 'nextDue', 'status'],
  reimbursements: ['employee', 'category', 'amount', 'status'],
};
