// @ts-check
/**
 * Audit trail writer (master §17: append-only audit_logs).
 * Call `audit(req, entity, action, details)` after mutating operations.
 * Never logs secrets/tokens/passwords — details are allow-listed by callers.
 */
import { prisma } from '../db/prisma.js';
import { logger } from '../common/logger.js';

/**
 * @param {import('express').Request} req
 * @param {string} entity
 * @param {string} action
 * @param {Record<string, unknown>} [details]
 */
export async function audit(req, entity, action, details = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: req.principal?.orgId ?? null,
        actorId: req.principal?.userId ?? null,
        entity,
        action,
        details,
        ip: req.ip ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, entity, action }, 'Failed to write audit log');
  }
}
