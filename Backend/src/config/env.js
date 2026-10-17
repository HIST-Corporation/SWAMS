// @ts-check
/**
 * Environment schema — validated at startup, fail fast (master §8.4).
 * JavaScript-only: zod validates plain process.env, no TS build step.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: z.string().default('false'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3001'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  DEFAULT_PAGE_SIZE: z.coerce.number().int().min(1).max(100).default(20),
  MAX_PAGE_SIZE: z.coerce.number().int().min(1).max(500).default(100),

  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().positive().default(24),

  SOCKET_CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3001'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SENTRY_DSN: z.string().optional().default(''),

  STORAGE_ADAPTER: z.enum(['s3', 'cloudinary', 'local']).default('s3'),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_REGION: z.string().default('ap-south-1'),
  CLOUDINARY_URL: z.string().optional().default(''),

  EMAIL_ADAPTER: z.enum(['resend', 'smtp', 'log']).default('resend'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('no-reply@swams.example.com'),

  REDIS_URL: z.string().optional().default(''),

  AI_PROVIDER: z.string().optional().default(''),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().optional().default(''),
  AI_MONTHLY_TOKEN_BUDGET: z.coerce.number().int().positive().default(1000000),
});

/**
 * Parse + validate env. Throws with readable details when invalid.
 * @param {Record<string, string | undefined>} [source]
 */
export function loadEnv(source = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n  - ${details.join('\n  - ')}`);
  }
  const env = parsed.data;
  return {
    ...env,
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    socketOrigins: env.SOCKET_CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    cookieSecure: env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production',
  };
}

/** @typedef {ReturnType<typeof loadEnv>} AppEnv */

/**
 * Process-wide singleton — validated once at first import. Modules import
 * `{ env }` and never touch process.env directly.
 */
export const env = loadEnv();
