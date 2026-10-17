// @ts-check
/**
 * Rate limiting (master §17 abuse/limits).
 * General limiter + stricter auth limiter (brute-force lockout support).
 */
import rateLimit from 'express-rate-limit';

/** @param {{ windowMs?: number, max?: number }} [options] */
export function buildRateLimiters(env) {
  const general = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { code: 'rate_limited', message: 'Too many requests, slow down', details: null, requestId: null },
  });

  const auth = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { code: 'rate_limited', message: 'Too many auth attempts, try again later', details: null, requestId: null },
  });

  return { general, auth };
}
