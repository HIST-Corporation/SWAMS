// @ts-check
/**
 * Audit module — the append-only trail the audit screen reads (contract row
 * 20). Requires `audit.read` (HR/owner/super_admin). Filters mirror the mock:
 * exact `action` key, case-insensitive `actor` substring, real totals with
 * out-of-range pages returning empty rows.
 */
import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { prisma } from '../../db/prisma.js';
import { requirePermission } from '../../middleware/auth.js';
import { parsePaging } from '../../common/http.js';

const router = Router();

router.get(
  '/',
  requirePermission('audit.read'),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
    const actor = (typeof req.query.actor === 'string' ? req.query.actor : '').trim().toLowerCase();
    const { page, perPage, skip, take } = parsePaging(req.query, { size: 10, max: 50 });

    const where = { orgId };
    if (action) where.action = action;
    if (actor) where.actor = { contains: actor, mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      rows: logs.map((log) => ({
        id: log.id,
        actor: log.actor?.name ?? 'System',
        entity: log.entity,
        action: log.action,
        createdAt: log.createdAt.toISOString(),
      })),
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  }),
);

export default router;
