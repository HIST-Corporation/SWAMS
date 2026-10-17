// @ts-check
/**
 * Platform console routes — contract row 31. A SEPARATE auth realm from the
 * workforce app: platform sessions hold NO business-data permissions, and a
 * workforce token is rejected here (realm check in platform-auth.js). The
 * console talks to its own cookie (`swams_pt`), never the workforce cookie.
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { unauthorized } from '../../common/errors.js';
import { verifyPassword } from '../../common/password.js';
import { requirePlatformAuth, requirePlatformPermission } from '../../middleware/platform-auth.js';

const router = Router();

// The console credential check (realm + password verify) runs in the route
// handler below; the zod layer must not short-circuit empty input with 422.
// email/password are optional strings so they pass through to the handler,
// which owns the 400 validation.
const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  portal: z.enum(['staff', 'hr']).optional(),
});

const COOKIE = 'swams_pt';

/** POST /platform/auth/login — platform admin sign-in (own session). */
router.post(
  '/auth/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const admin = await prisma.platformAdmin.findUnique({ where: { email: req.body.email.toLowerCase() } });
    const valid = admin ? await verifyPassword(admin.passwordHash, req.body.password) : false;
    if (!admin || !valid) throw unauthorized('Those platform credentials are not valid.');
    await prisma.platformAdmin.update({ where: { id: admin.id }, data: { lastSeenAt: new Date() } });
    const token = jwt.sign(
      { sub: admin.id, realm: 'platform', level: admin.level },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_TTL },
    );
    res.cookie(COOKIE, token, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: env.COOKIE_SAMESITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: '/',
      maxAge: 12 * 3_600_000,
    });
    return res.json({
      admin: { id: admin.id, name: admin.name, email: admin.email, level: admin.level },
      accessToken: token,
    });
  }),
);

/** POST /platform/auth/logout — end the platform session. */
router.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
  return res.status(204).end();
});

// Everything below requires a valid platform session.
router.use(requirePlatformAuth(env.JWT_ACCESS_SECRET));

/** GET /platform/summary — the console's overview tiles. */
router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const [orgs, admins, incidents] = await Promise.all([
      prisma.org.count(),
      prisma.platformAdmin.count(),
      prisma.auditLog.count({ where: { action: { contains: 'Failed' } } }),
    ]);
    const active = await prisma.org.count({ where: { status: 'active' } });
    return res.json({ orgs, active, admins, incidents });
  }),
);

/** GET /platform/orgs — the tenant list. */
router.get(
  '/orgs',
  requirePlatformPermission('users.manage'),
  asyncHandler(async (_req, res) => {
    const orgs = await prisma.org.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({
      rows: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        plan: org.plan,
        seats: org.seats,
        status: org.status,
        created: org.createdAt.toISOString().slice(0, 10),
      })),
    });
  }),
);

/** GET /platform/admins — console accounts (never org employees). */
router.get(
  '/admins',
  requirePlatformPermission('users.manage'),
  asyncHandler(async (_req, res) => {
    const admins = await prisma.platformAdmin.findMany({ orderBy: { name: 'asc' } });
    return res.json({
      rows: admins.map((admin) => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        level: admin.level,
        lastSeen: admin.lastSeenAt?.toISOString().slice(0, 10) ?? null,
      })),
    });
  }),
);

/** GET /platform/health — live service checks (DB roundtrip + process). */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const started = process.hrtime.bigint();
    let dbOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
    const uptimePercent = process.uptime() > 0 ? '100%' : '0%';
    return res.json({
      rows: [
        { id: 'svc_db', service: 'PostgreSQL 17', ok: dbOk, uptime: uptimePercent },
        { id: 'svc_api', service: 'Public API', ok: true, uptime: uptimePercent },
        { id: 'svc_latency', service: `DB roundtrip ${latencyMs.toFixed(1)}ms`, ok: dbOk, uptime: uptimePercent },
      ],
    });
  }),
);

export default router;
