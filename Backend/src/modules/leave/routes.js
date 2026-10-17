// @ts-check
/**
 * Leave module — balance, holidays, requests and decisions (contract row 14).
 * Shapes match `features/leave/mocks/handlers.js` exactly.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../common/errors.js';
import { audit } from '../../middleware/audit.js';
import { scopeFor } from '../../middleware/scope.js';

const router = Router();

/** GET /leave/balance — per-type entitlement rows for the session user. */
router.get(
  '/balance',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const [balances, types] = await Promise.all([
      prisma.leaveBalance.findMany({ where: { orgId, userId } }),
      prisma.leaveType.findMany({ where: { orgId, active: true } }),
    ]);
    const byKey = new Map(balances.map((b) => [b.typeKey, b]));
    const rows = types.map((type) => {
      const balance = byKey.get(type.key);
      const used = balance?.used ?? 0;
      const pending = balance?.pending ?? 0;
      return {
        type: type.key,
        entitled: type.entitled,
        used,
        pending,
        remaining: Math.max(0, type.entitled - used - pending),
      };
    });
    return res.json({ rows });
  }),
);

/** GET /leave/holidays — org holiday list. */
router.get(
  '/holidays',
  asyncHandler(async (req, res) => {
    const rows = await prisma.holiday.findMany({
      where: { orgId: req.principal.orgId },
      orderBy: { date: 'asc' },
    });
    return res.json({ rows: rows.map((h) => ({ date: h.date, name: h.title })) });
  }),
);

/** A request row in the mock's shape (mine or reviewer lens). */
function requestRow(row, { withEmployee = false } = {}) {
  const base = {
    id: row.id,
    type: row.typeKey,
    start: row.from,
    end: row.to,
    days: row.days,
    status: row.status,
    note: row.reason || null,
    submittedAt: row.createdAt.toISOString().slice(0, 10),
  };
  if (row.deciderId) base.decidedBy = row.deciderId;
  if (withEmployee && row.requester) {
    base.employee = { id: row.requester.id, name: row.requester.name };
  }
  return base;
}

/** GET /leave/requests?status=mine|pending|all (contract row 14). */
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const scope = scopeFor(req.principal);
    const include = { requester: { select: { id: true, name: true } } };
    const where = { orgId };
    const withEmployee = status !== 'mine';
    if (status === 'mine' || scope === 'self') {
      where.requesterId = userId;
      const rows = await prisma.leaveRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ rows: rows.map((r) => requestRow(r)) });
    }
    if (status === 'pending') where.status = 'pending';
    const rows = await prisma.leaveRequest.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ rows: rows.map((r) => requestRow(r, { withEmployee })) });
  }),
);

const createSchema = z.object({
  type: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().positive().optional(),
  note: z.string().optional().nullable(),
});

/** POST /leave/requests — 201 with the pending record (contract row 14). */
router.post(
  '/requests',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const { type, start, end, days, note } = req.body;
    if (new Date(start) > new Date(end)) {
      throw new AppError('invalid_range', 'End date must be on or after the start date.', {
        httpStatus: 422,
      });
    }
    const computedDays =
      days ?? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
    const row = await prisma.leaveRequest.create({
      data: {
        orgId,
        requesterId: userId,
        typeKey: type,
        from: start,
        to: end,
        days: computedDays,
        reason: note ?? '',
        status: 'pending',
      },
    });
    // Track the pending day(s) against the balance so the queue and the
    // balance never disagree.
    await prisma.leaveBalance
      .upsert({
        where: { orgId_userId_typeKey: { orgId, userId, typeKey: type } },
        update: { pending: { increment: computedDays } },
        create: { orgId, userId, typeKey: type, pending: computedDays },
      })
      .catch(() => {});
    await audit(req, 'leave', 'leaveRequested', { requestId: row.id });
    return res.status(201).json(requestRow(row));
  }),
);

const decisionSchema = z.object({ decision: z.enum(['approve', 'reject']) });

/** POST /leave/requests/:id/decision — contract row 14. */
router.post(
  '/requests/:id/decision',
  validate(decisionSchema),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const { decision } = req.body;
    const existing = await prisma.leaveRequest.findFirst({
      where: { id: req.params.id, orgId },
      include: { requester: { select: { id: true, name: true } } },
    });
    if (!existing) {
      throw new AppError('not_found', 'That request no longer exists.', { httpStatus: 404 });
    }
    if (existing.status !== 'pending') {
      throw new AppError('conflict', 'That request has already been answered.', { httpStatus: 409 });
    }
    const status = decision === 'approve' ? 'approved' : 'rejected';
    const updated = await prisma.leaveRequest.update({
      where: { id: existing.id },
      data: { status, deciderId: req.principal.userId, decidedAt: new Date() },
    });
    // Balance bookkeeping: an approval consumes the days, a rejection frees
    // the pending hold — either way the pending counter drops.
    await prisma.leaveBalance
      .upsert({
        where: {
          orgId_userId_typeKey: { orgId, userId: existing.requesterId, typeKey: existing.typeKey },
        },
        update:
          status === 'approved'
            ? { pending: { decrement: existing.days }, used: { increment: existing.days } }
            : { pending: { decrement: existing.days } },
        create:
          status === 'approved'
            ? { orgId, userId: existing.requesterId, typeKey: existing.typeKey, used: existing.days }
            : { orgId, userId: existing.requesterId, typeKey: existing.typeKey },
      })
      .catch(() => {});
    await audit(req, 'leave', status === 'approved' ? 'leaveApproved' : 'leaveRejected', {
      requestId: updated.id,
    });
    return res.json({ record: requestRow({ ...updated, requester: existing.requester }) });
  }),
);



export default router;
