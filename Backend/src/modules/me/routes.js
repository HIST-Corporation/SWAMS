// @ts-check
/**
 * /me routes — the session profile the shell renders, preferences merge, and
 * org setup. Shapes match `features/auth/mocks/handlers.js`.
 */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { notFound, badRequest } from '../../common/errors.js';
import { prisma } from '../../db/prisma.js';
import { audit } from '../../middleware/audit.js';
import { sessionFor } from '../auth/service.js';

const router = Router();

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.principal.userId },
      include: { preferences: true, org: true },
    });
    if (!user) throw notFound('Session user no longer exists.');
    return res.json(sessionFor(user));
  }),
);

const preferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  language: z.string().max(10).optional(),
  calendar: z.enum(['bs', 'ad']).optional(),
});

router.patch(
  '/me/preferences',
  validate(preferencesSchema),
  asyncHandler(async (req, res) => {
    const userId = req.principal.userId;
    const existing = await prisma.userPreferences.findUnique({ where: { userId } });
    const merged = {
      theme: req.body.theme ?? existing?.theme ?? 'system',
      language: req.body.language ?? existing?.language ?? 'en',
      calendar: req.body.calendar ?? existing?.calendar ?? 'bs',
    };
    const saved = await prisma.userPreferences.upsert({
      where: { userId },
      update: merged,
      create: { userId, ...merged },
    });
    return res.json({
      theme: saved.theme,
      language: saved.language,
      calendar: saved.calendar,
    });
  }),
);

const orgSetupSchema = z.object({ name: z.string().min(1) });

router.post(
  '/org/setup',
  validate(orgSetupSchema),
  asyncHandler(async (req, res) => {
    if (!req.principal.orgId) throw badRequest('invalid_org', 'No organization on this session.');
    const org = await prisma.org.update({
      where: { id: req.principal.orgId },
      data: { name: req.body.name },
    });
    await audit(req, 'org', 'profileUpdated', { orgId: org.id });
    return res.json({
      org: {
        id: org.id,
        name: org.name,
        timezone: org.timezone,
        fiscalYearStart: org.fiscalYearStart,
      },
      status: 'configured',
    });
  }),
);

export default router;
