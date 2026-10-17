// @ts-check
/**
 * Notifications module — the bell (contract rows 17–19, 29). Shapes match
 * `features/notifications/mocks/handlers.js`: the `audience` field never
 * leaks to the client, and only whitelisted keys may be created.
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../common/errors.js';

const router = Router();

/** Keys a client may raise directly; everything else is server-composed. */
const ALLOWED_KEYS = new Set(['callRequested']);

/** Strip server-only fields from a row. */
function toRow(row) {
  const { audience, ...rest } = row;
  void audience;
  return { ...rest, createdAt: row.createdAt.toISOString() };
}

/** GET /notifications — the signed-in user's bell. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await prisma.notification.findMany({
      where: { orgId: req.principal.orgId, userId: req.principal.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ rows: rows.map(toRow) });
  }),
);

const createSchema = z.object({
  kind: z.string().optional(),
  key: z.string().min(1),
  params: z.record(z.unknown()).optional(),
  link: z.string().nullable().optional(),
});

/** POST /notifications — one bell entry per request (contract row 29). */
router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { key } = req.body;
    if (!ALLOWED_KEYS.has(key)) {
      throw new AppError('invalid_notification', 'Unknown notification kind.', { httpStatus: 422 });
    }
    const row = await prisma.notification.create({
      data: {
        orgId: req.principal.orgId,
        userId: req.principal.userId,
        kind: req.body.kind ?? 'call',
        key,
        params: req.body.params ?? {},
        link: req.body.link ?? '/video',
        audience: 'all',
      },
    });
    return res.json({ record: toRow(row) }, 201);
  }),
);

/** POST /notifications/read-all — mark everything read. */
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { orgId: req.principal.orgId, userId: req.principal.userId, read: false },
      data: { read: true },
    });
    return res.json({ updated: result.count });
  }),
);

/** POST /notifications/:id/read — mark one read. */
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const existing = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        orgId: req.principal.orgId,
        userId: req.principal.userId,
      },
    });
    if (!existing) {
      throw new AppError('not_found', 'That notification no longer exists.', { httpStatus: 404 });
    }
    const row = await prisma.notification.update({
      where: { id: existing.id },
      data: { read: true },
    });
    return res.json({ record: toRow(row) });
  }),
);

export default router;
