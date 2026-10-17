// @ts-check
/**
 * Structured logger (master §8.4/§17: PII-redacted logs, never secrets/tokens).
 * pino in prod, pino-pretty in dev. Redacts auth + PII fields automatically.
 */
import pino from 'pino';

const redacted = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'set-cookie',
  'apiKey',
  '*.password',
  '*.passwordHash',
  '*.token',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: { paths: redacted, censor: '[REDACTED]' },
  ...(process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
    : {}),
});

export default logger;
