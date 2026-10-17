/**
 * One error shape for the whole UI (Section 10, Data):
 * UI shows `message`, and `requestId` collapsed under "Details".
 */
export class AppError extends Error {
  /**
   * @param {{ code?: string, message: string, details?: unknown, requestId?: string, status?: number, cause?: unknown }} init
   */
  constructor({ code = 'unknown_error', message, details, requestId, status, cause } = {}) {
    super(message ?? 'Something went wrong');
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.status = status;
    if (cause !== undefined) this.cause = cause;
  }
}

/** Offline / network-level failure. */
export const isOfflineError = (err) =>
  err instanceof AppError && (err.code === 'network_error' || err.code === 'offline');

/**
 * Map any thrown value to an AppError (never leak axios types into the UI).
 * @param {unknown} error
 * @returns {AppError}
 */
export function toAppError(error) {
  if (error instanceof AppError) return error;

  const response = error?.response;
  const status = response?.status;
  const body = response?.data;
  const requestId =
    body?.requestId ??
    response?.headers?.['x-request-id'] ??
    response?.headers?.['X-Request-Id'] ??
    error?.config?.headers?.['X-Request-Id'];

  if (!response) {
    return new AppError({
      code: 'network_error',
      message: "We couldn't reach the server. Check your connection and try again.",
      requestId,
      cause: error,
    });
  }

  return new AppError({
    code: body?.code ?? `http_${status}`,
    message: body?.message ?? defaultMessagesFor(status),
    details: body?.details,
    requestId,
    status,
    cause: error,
  });
}

function defaultMessagesFor(status) {
  if (status === 401) return 'Your session ended. Sign in again to continue.';
  if (status === 403) return "You don't have access to this.";
  if (status === 404) return "We couldn't find that.";
  if (status === 409) return 'That changed while you were working. Reload and try again.';
  if (status >= 500) return 'The server had a problem. Try again in a moment.';
  return 'Something went wrong.';
}
