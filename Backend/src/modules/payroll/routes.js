// @ts-check
/**
 * Payroll module — salary structures, compensation, pay runs, payslips,
 * loans, reimbursements and settings. Server-owned scope & RBAC (contract
 * request 30). Shapes mirror frontend/features/payroll/mocks/handlers.js.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { badRequest, forbidden, notFound, unprocessable } from '../../common/errors.js';
import { audit } from '../../middleware/audit.js';
import { scopeFor } from '../../middleware/scope.js';

const router = Router();

function requireOrgScope(p) {
  if (scopeFor(p) !== 'organization') throw forbidden('scope_denied', 'This session only sees its own payroll records.');
}
function requireManage(p) {
  if (!p.permissions.includes('payroll.manage')) throw forbidden('not_permitted', 'This action needs payroll.manage.');
}

const NEXT_STAGE = {
  draft: { action: 'collect', next: 'inputs' },
  inputs: { action: 'startReview', next: 'review' },
  review: { action: 'sendApproval', next: 'approval' },
  approval: { action: 'approve', next: 'finalize' },
  finalize: { action: 'publish', next: 'publish' },
};

// ── Periods (both lenses: labels only, no amounts) ─────────────────
router.get('/periods', asyncHandler(async (req, res) => {
  const rows = await prisma.payPeriod.findMany({
    where: { orgId: req.principal.orgId },
    orderBy: { start: 'asc' },
  });
  return res.json({ rows });
}));

// ── The run (organization read; workspace composes from it) ────────
router.get('/run', asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  const run = await prisma.payrollRun.findFirst({
    where: { orgId: req.principal.orgId, ...(req.query.periodId ? { periodId: req.query.periodId } : {}) },
    include: { exceptions: true, approvals: true, history: { take: 8, orderBy: { createdAt: 'desc' } } },
    orderBy: { updatedAt: 'desc' },
  });
  return res.json({ run, history: run ? run.history : [] });
}));

// ── Run transition (manage; one stage per action, guarded) ─────────
const transitionSchema = z.object({
  action: z.enum(['collect', 'startReview', 'sendApproval', 'approve', 'publish']),
  note: z.string().optional(),
  confirm: z.boolean().optional(),
});
router.post('/run/transition', validate(transitionSchema), asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const { action, note, confirm } = req.body;
  const run = await prisma.payrollRun.findFirst({
    where: { orgId: req.principal.orgId },
    orderBy: { updatedAt: 'desc' },
  });
  if (!run) throw notFound('No payroll run for this org.');
  const step = NEXT_STAGE[run.stage];
  if (!step || action !== step.action) {
    throw unprocessable('invalid_transition', `Stage "${run.stage}" does not accept that action.`);
  }
  if (step.next === 'approval') {
    const open = await prisma.runException.count({ where: { runId: run.id, resolvedAt: null } });
    if (open > 0) throw unprocessable('exceptions_open', 'Resolve every exception before requesting approval.');
  }
  if (action === 'approve') {
    const s = await prisma.payrollSetting.findUnique({ where: { orgId: req.principal.orgId } });
    if (s?.requireApproval && (!note || !note.trim())) {
      throw unprocessable('note_required', 'An approval note is required by the workflow policy.');
    }
  }
  if (action === 'publish' && confirm !== true) {
    throw unprocessable('confirm_required', 'Confirm publishing before the run is locked.');
  }
  const data = { stage: step.next, updatedAt: new Date() };
  if (action === 'publish') data.periodStatus = 'published';
  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data,
    include: { exceptions: true, approvals: true, history: { take: 8, orderBy: { createdAt: 'desc' } } },
  });
  await prisma.runHistory.create({
    data: { orgId: req.principal.orgId, runId: run.id, actorId: req.principal.userId, stage: step.next, note: action },
  });
  if (action === 'approve') {
    await prisma.runApproval.create({ data: { orgId: req.principal.orgId, runId: run.id, actorId: req.principal.userId, note: note ?? '' } });
  }
  await audit(req, 'payroll', 'runTransitioned', { runId: run.id, action, stage: step.next });
  return res.json({ run: updated });
}));

// ── Exception resolve (manage) ─────────────────────────────────────
router.post('/run/exceptions/:id/resolve', asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const ex = await prisma.runException.findFirst({ where: { id: req.params.id, orgId: req.principal.orgId } });
  if (!ex) throw notFound('That exception no longer exists.');
  await prisma.runException.update({ where: { id: req.params.id }, data: { resolvedAt: new Date() } });
  const run = await prisma.payrollRun.findUnique({
    where: { id: ex.runId },
    include: { exceptions: true, approvals: true, history: { take: 8, orderBy: { createdAt: 'desc' } } },
  });
  await audit(req, 'payroll', 'exceptionResolved', { exceptionId: ex.id });
  return res.json({ run });
}));

// ── Salary structures (org read; manage write) ─────────────────────
router.get('/structures', asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  const [rows, components] = await Promise.all([
    prisma.salaryStructure.findMany({ where: { orgId: req.principal.orgId }, orderBy: { createdAt: 'desc' } }),
    prisma.payrollComponent.findMany({ where: { orgId: req.principal.orgId } }),
  ]);
  return res.json({ rows, components });
}));

const structureSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  effectiveFrom: z.string().min(1),
  componentIds: z.array(z.string()).optional(),
});
router.post('/structures', validate(structureSchema), asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const { name, description, effectiveFrom, componentIds = [] } = req.body;
  const hasEarning = await prisma.payrollComponent.findFirst({
    where: { orgId: req.principal.orgId, id: { in: componentIds }, kind: 'earning' },
  });
  if (componentIds.length === 0 || !hasEarning) {
    throw unprocessable('earning_required', 'Keep at least one earning component.');
  }
  const record = await prisma.salaryStructure.create({
    data: { orgId: req.principal.orgId, name: name.trim(), description: description ?? '', effectiveFrom, componentIds, sample: true },
  });
  await audit(req, 'payroll', 'structureCreated', { structureId: record.id });
  return res.status(201).json({ record });
}));

const patchStructureSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  effectiveFrom: z.string().optional(),
  componentIds: z.array(z.string()).optional(),
});
router.patch('/structures/:id', validate(patchStructureSchema), asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const row = await prisma.salaryStructure.findFirst({ where: { id: req.params.id, orgId: req.principal.orgId } });
  if (!row) throw notFound('That structure no longer exists.');
  const { name, description, effectiveFrom, componentIds } = req.body;
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description;
  if (effectiveFrom !== undefined) data.effectiveFrom = effectiveFrom;
  if (componentIds !== undefined) {
    const hasEarning = await prisma.payrollComponent.findFirst({
      where: { orgId: req.principal.orgId, id: { in: componentIds }, kind: 'earning' },
    });
    if (componentIds.length === 0 || !hasEarning) {
      throw unprocessable('earning_required', 'Keep at least one earning component.');
    }
    data.componentIds = componentIds;
  }
  const record = await prisma.salaryStructure.update({ where: { id: req.params.id }, data });
  await audit(req, 'payroll', 'structureUpdated', { structureId: record.id });
  return res.json({ record });
}));

// ── Compensation (self always; org for organization lens) ──────────
router.get('/compensation', asyncHandler(async (req, res) => {
  const scope = typeof req.query.scope === 'string' ? req.query.scope : 'self';
  if (scope === 'org') {
    requireOrgScope(req.principal);
    const [rows, history] = await Promise.all([
      prisma.compensation.findMany({ where: { orgId: req.principal.orgId }, include: { employee: { select: { id: true, name: true, initials: true } } }, orderBy: { employeeId: 'asc' } }),
      prisma.salaryHistory.findMany({ where: { orgId: req.principal.orgId }, orderBy: { createdAt: 'desc' } }),
    ]);
    return res.json({ rows, history });
  }
  if (scope !== 'self') throw badRequest('invalid_scope', 'Scope must be "self" or "org".');
  const rows = await prisma.compensation.findMany({
    where: { orgId: req.principal.orgId, employeeId: req.principal.userId },
    include: { employee: { select: { id: true, name: true, initials: true } }, structure: true },
    orderBy: { effectiveFrom: 'desc' },
  });
  const history = await prisma.salaryHistory.findMany({ where: { orgId: req.principal.orgId, employeeId: req.principal.userId }, orderBy: { createdAt: 'desc' } });
  return res.json({ rows, history });
}));

// ── Payslips (self always; every slip for organization lens) ───────
router.get('/payslips', asyncHandler(async (req, res) => {
  const scope = typeof req.query.scope === 'string' ? req.query.scope : 'self';
  const where = scope === 'org' ? (requireOrgScope(req.principal), { orgId: req.principal.orgId })
    : scope === 'self' ? { orgId: req.principal.orgId, employeeId: req.principal.userId }
    : (() => { throw badRequest('invalid_scope', 'Scope must be "self" or "org".'); })();
  const rows = await prisma.payslip.findMany({
    where,
    include: { employee: { select: { id: true, name: true, initials: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ rows: rows.map((p) => ({ ...p, totals: { gross: p.gross, deductions: p.deductionsAmt, net: p.net, employerContributions: p.employerContributions } })) });
}));

router.get('/payslips/:id', asyncHandler(async (req, res) => {
  const payslip = await prisma.payslip.findFirst({ where: { id: req.params.id, orgId: req.principal.orgId } });
  if (!payslip) throw notFound('That payslip no longer exists.');
  const isOwn = payslip.employeeId === req.principal.userId;
  if (!isOwn && scopeFor(req.principal) !== 'organization') throw forbidden('scope_denied', 'This session only sees its own payslips.');
  return res.json({ payslip: { ...payslip, totals: { gross: payslip.gross, deductions: payslip.deductionsAmt, net: payslip.net, employerContributions: payslip.employerContributions } } });
}));

// ── Loans (list scoped; request self; decide manage) ───────────────
router.get('/loans', asyncHandler(async (req, res) => {
  const scope = typeof req.query.scope === 'string' ? req.query.scope : 'self';
  if (scope === 'org') { requireOrgScope(req.principal); }
  else if (scope !== 'self') throw badRequest('invalid_scope', 'Scope must be "self" or "org".');
  const where = scope === 'org' ? { orgId: req.principal.orgId } : { orgId: req.principal.orgId, employeeId: req.principal.userId };
  const rows = await prisma.loan.findMany({ where, include: { employee: { select: { id: true, name: true, initials: true } } }, orderBy: { createdAt: 'desc' } });
  return res.json({ rows });
}));

const loanSchema = z.object({ principal: z.number().int().positive(), installment: z.number().int().positive() });
router.post('/loans', validate(loanSchema), asyncHandler(async (req, res) => {
  const { principal, installment } = req.body;
  if (installment > principal) throw badRequest('installment_exceeds_principal', 'Installment must not exceed the loan amount.');
  const record = await prisma.loan.create({ data: { orgId: req.principal.orgId, employeeId: req.principal.userId, principal, installment, outstanding: principal, status: 'active' }, include: { employee: { select: { id: true, name: true, initials: true } } } });
  await audit(req, 'payroll', 'loanRequested', { loanId: record.id });
  return res.status(201).json({ record });
}));

const decisionSchema = z.object({ decision: z.enum(['approve', 'reject']) });
router.post('/loans/:id/decision', validate(decisionSchema), asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const loan = await prisma.loan.findFirst({ where: { id: req.params.id, orgId: req.principal.orgId } });
  if (!loan) throw notFound('That loan no longer exists.');
  if (loan.status !== 'active') throw unprocessable('conflict', 'That loan has already been decided.');
  const status = req.body.decision === 'approve' ? 'active' : 'rejected';
  const updated = await prisma.loan.update({ where: { id: req.params.id }, data: { status } });
  await audit(req, 'payroll', `loan${req.body.decision === 'approve' ? 'Approved' : 'Rejected'}`, { loanId: loan.id });
  return res.json({ record: updated });
}));

// ── Reimbursements (list scoped; submit self; decide manage) ───────
router.get('/reimbursements', asyncHandler(async (req, res) => {
  const scope = typeof req.query.scope === 'string' ? req.query.scope : 'self';
  if (scope === 'org') { requireOrgScope(req.principal); }
  else if (scope !== 'self') throw badRequest('invalid_scope', 'Scope must be "self" or "org".');
  const where = scope === 'org' ? { orgId: req.principal.orgId } : { orgId: req.principal.orgId, employeeId: req.principal.userId };
  const rows = await prisma.reimbursement.findMany({ where, include: { employee: { select: { id: true, name: true, initials: true } } }, orderBy: { createdAt: 'desc' } });
  return res.json({ rows });
}));

const reimburseSchema = z.object({ category: z.string().min(1), amount: z.number().int().positive(), spentOn: z.string().min(1), note: z.string().optional() });
router.post('/reimbursements', validate(reimburseSchema), asyncHandler(async (req, res) => {
  const record = await prisma.reimbursement.create({ data: { orgId: req.principal.orgId, employeeId: req.principal.userId, category: req.body.category, amount: req.body.amount, spentOn: req.body.spentOn, note: req.body.note ?? null, status: 'pending' }, include: { employee: { select: { id: true, name: true, initials: true } } } });
  await audit(req, 'payroll', 'reimbursementSubmitted', { reimbursementId: record.id });
  return res.status(201).json({ record });
}));

router.post('/reimbursements/:id/decision', validate(decisionSchema), asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const claim = await prisma.reimbursement.findFirst({ where: { id: req.params.id, orgId: req.principal.orgId } });
  if (!claim) throw notFound('That claim no longer exists.');
  if (claim.status !== 'pending') throw unprocessable('conflict', 'That claim has already been decided.');
  const updated = await prisma.reimbursement.update({ where: { id: req.params.id }, data: { status: req.body.decision === 'approve' ? 'approved' : 'rejected' } });
  await audit(req, 'payroll', `reimbursement${req.body.decision === 'approve' ? 'Approved' : 'Rejected'}`, { reimbursementId: claim.id });
  return res.json({ record: updated });
}));

// ── Settings (org read; manage write) ──────────────────────────────
router.get('/settings', asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  let setting = await prisma.payrollSetting.findUnique({ where: { orgId: req.principal.orgId } });
  if (!setting) {
    setting = await prisma.payrollSetting.create({ data: { orgId: req.principal.orgId, sample: true } });
  }
  return res.json({ setting });
}));

const settingsSchema = z.object({
  frequency: z.enum(['monthly', 'biweekly', 'weekly']).optional(),
  payDay: z.number().int().min(1).max(31).optional(),
  fiscalYearStart: z.string().optional(),
  currency: z.string().min(1).optional(),
  requireApproval: z.boolean().optional(),
  autoLock: z.boolean().optional(),
});
router.post('/settings', validate(settingsSchema), asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  requireManage(req.principal);
  const setting = await prisma.payrollSetting.upsert({
    where: { orgId: req.principal.orgId },
    update: req.body,
    create: { orgId: req.principal.orgId, ...req.body, sample: true },
  });
  await audit(req, 'payroll', 'settingsSaved', { orgId: req.principal.orgId });
  return res.json({ setting });
}));

// ── Reports (org read) ─────────────────────────────────────────────
const REPORT_TYPES = ['register', 'deductions', 'overtime', 'loans', 'reimbursements'];
router.get('/reports/:type', asyncHandler(async (req, res) => {
  requireOrgScope(req.principal);
  const { type } = req.params;
  if (!REPORT_TYPES.includes(type)) throw badRequest('invalid_type', 'Unknown report type.');
  const periodId = req.query.periodId;
  const baseWhere = { orgId: req.principal.orgId, ...(periodId ? { periodId } : {}) };
  let rows;
  if (type === 'register') {
    rows = await prisma.compensation.findMany({ where: baseWhere, include: { employee: { select: { name: true } } } });
  } else if (type === 'loans') {
    rows = await prisma.loan.findMany({ where: baseWhere, include: { employee: { select: { name: true } } } });
  } else if (type === 'reimbursements') {
    rows = await prisma.reimbursement.findMany({ where: baseWhere, include: { employee: { select: { name: true } } } });
  } else {
    rows = [];
  }
  return res.json({ type, rows, periodId: periodId ?? null });
}));

export default router;
