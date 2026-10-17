// @ts-check
/**
 * Idempotency middleware (contract items 2/3: punch + offline sync retries).
 * Clients send `Idempotency-Key`; the first response is replayed for 24h.
 * Stored in `idempotency_keys` table — survives restarts, unlike memory.
 */
import { prisma } from '../db/prisma.js';

/**
 * @param {{ ttlHours?: number }} [options]
 */
export function idempotency(options = {}) {
  const ttlHours = options.ttlHours ?? 24;
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.body?.idempotencyKey;
    if (!key || typeof key !== 'string') return next();
    req.idempotencyKey = key;

    try {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
      if (existing && existing.expiresAt > new Date()) {
        res.setHeader('X-Idempotent-Replayed', 'true');
        return res.status(existing.status).json(existing.body);
      }
    } catch {
      // DB unavailable — fail open so punch flow is never blocked by cache layer.
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      prisma.idempotencyKey
        .upsert({
          where: { key },
          update: { status: res.statusCode, body: body ?? {}, expiresAt: new Date(Date.now() + ttlHours * 3_600_000) },
          create: {
            key,
            orgId: req.principal?.orgId ?? null,
            status: res.statusCode,
            body: body ?? {},
            expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
          },
        })
        .catch(() => {});
      return originalJson(body);
    };
    return next();
  };
}
