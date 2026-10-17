// @ts-check
/**
 * Typed application error — one error middleware renders these.
 * Shape matches Frontend packages/api-client AppError body:
 * { code, message, details, requestId }.
 */
export class AppError extends Error {
  /**
   * @param {string} code canonical code (see config/constants ERROR_CODES)
   * @param {string} message human-readable (EN; i18n key resolution is client-side)
   * @param {{ httpStatus?: number, details?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = options.httpStatus ?? 400;
    this.details = options.details ?? null;
  }
}

/** 400 with explicit code. @param {string} code @param {string} [message] @param {unknown} [details] */
export const badRequest = (code, message = 'Bad request', details = null) =>
  new AppError(code, message, { httpStatus: 400, details });

/** @param {string} [message] */
export const unauthorized = (message = 'Authentication required') =>
  new AppError('unauthorized', message, { httpStatus: 401 });

/** @param {string} [code] @param {string} [message] */
export const forbidden = (code = 'forbidden', message = 'Forbidden') =>
  new AppError(code, message, { httpStatus: 403 });

/** @param {string} [message] */
export const notFound = (message = 'Not found') => new AppError('not_found', message, { httpStatus: 404 });

/** @param {string} code @param {string} [message] @param {unknown} [details] */
export const unprocessable = (code, message = 'Unprocessable entity', details = null) =>
  new AppError(code, message, { httpStatus: 422 });

/** @param {string} [message] */
export const conflict = (message = 'Conflict') => new AppError('conflict', message, { httpStatus: 409 });

/**
 * Normalize unknown throws into AppError (never leak stacks in prod).
 * @param {unknown} err
 */
export function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err && typeof err === 'object' && 'code' in err) {
    const e = /** @type {{ code?: string, message?: string }} */ (err);
    return new AppError('internal', e.message || 'Internal server error', { httpStatus: 500 });
  }
  return new AppError('internal', 'Internal server error', { httpStatus: 500 });
}
