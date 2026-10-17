// @ts-check
/**
 * Health module — unauthenticated liveness + DB roundtrip for container
 * probes. Never exposes configuration or stack details.
 */
import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { prisma } from '../../db/prisma.js';

const router = Router();
const startedAt = Date.now();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    let db = 'up';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return res.json({
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    });
  }),
);

export default router;
