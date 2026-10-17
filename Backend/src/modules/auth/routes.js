// @ts-check
/**
 * Auth routes — contract rows 4–8. Shapes match the frontend mock handlers
 * (`apps/web/src/features/auth/mocks/handlers.js`) exactly:
 *   POST /auth/login → {accessToken, session} | {mfaRequired:true}
 *   POST /auth/mfa → {accessToken, session}
 *   POST /auth/forgot-password → 202 {status:'sent'} (enumeration-safe)
 *   POST /auth/refresh → {accessToken, session}
 *   POST /auth/logout → 204
 */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { audit } from '../../middleware/audit.js';
import * as authService from './service.js';

const router = Router();

// NOTE: email/password are deliberately NOT constrained in the zod layer
// (no min()/email() checks). The auth service (login()) owns the 400
// validation (invalid_email / weak_password) which the contract expects for
// missing/empty credentials. The zod layer only narrows `portal` and must
// not short-circuit with 422 and mask the service's error codes.
const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  portal: z.enum(['staff', 'hr']).optional(),
});

const mfaSchema = z.object({
  code: z.string().min(1),
  mfaToken: z.string().min(1),
  portal: z.enum(['staff', 'hr']).optional(),
});

const forgotSchema = z.object({ email: z.string().min(1) });

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, res, env);
    if (result.mfaRequired) return res.json({ mfaRequired: true, mfaToken: result.mfaToken });
    await audit(req, 'auth', 'login', { userId: req.body.email });
    return res.json(result);
  }),
);

router.post(
  '/mfa',
  validate(mfaSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.completeMfa(req.body, res, env);
    return res.json(result);
  }),
);

router.post(
  '/forgot-password',
  validate(forgotSchema),
  asyncHandler(async (req, res) => {
    // Enumeration-safe: same 202 whether or not the account exists. The real
    // backend stores a one-time reset token; email delivery is adapter-based.
    const user = await prisma.user.findFirst({ where: { email: req.body.email.toLowerCase() } });
    if (user) {
      const { randomBytes } = await import('node:crypto');
      const token = randomBytes(32).toString('hex');
      const { createHash } = await import('node:crypto');
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      // DEV ONLY: log the link. Production sends it via the email adapter.
      req.log?.info?.({ userId: user.id }, 'Password reset token issued');
    }
    return res.status(202).json({ status: 'sent' });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req, res, env);
    return res.json(result);
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req, res, env);
    return res.status(204).end();
  }),
);

export default router;
