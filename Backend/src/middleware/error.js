// @ts-check
/**
 * Central error middleware — the ONLY place that renders error responses.
 * Shape matches Frontend packages/api-client AppError:
 * { code, message, details, requestId }. Never leaks stacks in production.
 */
import { AppError } from '../common/errors.js';
import { logger } from '../common/logger.js';

/**
 * @param {unknown} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, _next) {
  // express.json() syntax errors arrive here directly (never wrapped in
  // AppError): answer 400 invalid_json instead of a misleading 500.
  const bodyParseError =
    err && typeof err === 'object' && 'type' in err && err.type === 'entity.parse.failed'
      ? new AppError('invalid_json', 'Request body is not valid JSON.', { httpStatus: 400 })
      : null;
  const appError = bodyParseError ?? (err instanceof AppError ? err : new AppError('internal', 'Internal server error', { httpStatus: 500 }));
  const status = appError.httpStatus ?? 500;
  const requestId = req.requestId || req.headers['x-request-id'] || null;

  if (status >= 500) {
    logger.error({ err, requestId, path: req.path }, 'Unhandled server error');
  } else {
    logger.warn({ code: appError.code, requestId, path: req.path }, 'Request error');
  }

  res.status(status).json({
    code: appError.code,
    message: appError.message,
    details: appError.details ?? null,
    requestId,
  });
}

/** 404 for unknown routes under the API prefix. */
export function notFoundMiddleware(req, res) {
  const requestId = req.requestId || req.headers['x-request-id'] || null;
  res.status(404).json({ code: 'not_found', message: 'Route not found', details: null, requestId });
}
