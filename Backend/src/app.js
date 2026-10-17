// @ts-check
/**
 * Express app factory — middleware order matters:
 *   security (helmet) → CORS (frontend origins only) → request id →
 *   body parsing → cookies → rate limit → routes → 404 → error envelope.
 * The error envelope matches Frontend packages/api-client AppError:
 * { code, message, details, requestId }.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './common/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { buildRateLimiters } from './middleware/rate-limit.js';
import { requireAuth } from './middleware/auth.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.js';
import { withUserContext } from './modules/shared/context.js';

import authRoutes from './modules/auth/routes.js';
import meRoutes from './modules/me/routes.js';
import attendanceRoutes from './modules/attendance/routes.js';
import leaveRoutes from './modules/leave/routes.js';
import taskRoutes from './modules/tasks/routes.js';
import calendarRoutes from './modules/calendar/routes.js';
import notificationRoutes from './modules/notifications/routes.js';
import dashboardRoutes from './modules/dashboard/routes.js';
import reportRoutes from './modules/reports/routes.js';
import auditRoutes from './modules/audit/routes.js';
import platformRoutes from './modules/platform/routes.js';
import healthRoutes from './modules/health/routes.js';

export function buildApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = same-origin tools (curl, server tests).
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      exposedHeaders: ['X-Request-Id', 'X-Idempotent-Replayed'],
    }),
  );
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.requestId,
      autoLogging: !env.isTest,
    }),
  );
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const limiters = buildRateLimiters(env);
  app.use(limiters.general);

  // Unauthenticated liveness probe (before the auth middleware).
  app.use('/health', healthRoutes);

  // Platform console — separate realm, its own cookie, no workforce scopes.
  app.use(`${env.API_PREFIX}/platform`, platformRoutes);

  // Auth routes must come BEFORE requireAuth: login/refresh/logout are how a
  // token is obtained in the first place. They carry their own rate limits.
  app.use(`${env.API_PREFIX}/auth/login`, limiters.auth);
  app.use(`${env.API_PREFIX}/auth/mfa`, limiters.auth);
  app.use(`${env.API_PREFIX}/auth/forgot-password`, limiters.auth);
  app.use(`${env.API_PREFIX}/auth`, authRoutes);

  // Workforce API — every route below requires a valid access token.
  const auth = requireAuth(env.JWT_ACCESS_SECRET);
  app.use(env.API_PREFIX, auth, withUserContext);
  app.use(env.API_PREFIX, meRoutes);
  app.use(`${env.API_PREFIX}/attendance`, attendanceRoutes);
  app.use(`${env.API_PREFIX}/leave`, leaveRoutes);
  app.use(`${env.API_PREFIX}/tasks`, taskRoutes);
  app.use(`${env.API_PREFIX}/calendar`, calendarRoutes);
  app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${env.API_PREFIX}`, dashboardRoutes); // /presence, /org/*, /events/*, /staff/board
  app.use(`${env.API_PREFIX}/reports`, reportRoutes);
  app.use(`${env.API_PREFIX}/audit`, auditRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
