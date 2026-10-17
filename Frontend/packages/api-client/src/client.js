import axios from 'axios';
import { AppError, toAppError } from './app-error.js';

/**
 * Create the app's request layer (Section 5: access token in memory,
 * refresh via httpOnly cookie, ONE in-flight refresh shared by queued requests).
 *
 * @param {{
 *   baseURL?: string,
 *   getAccessToken?: () => string | null,
 *   refreshSession?: () => Promise<void>,
 *   onSessionEnded?: () => void,
 *   makeRequestId?: () => string,
 *   timeoutMs?: number,
 * }} [options]
 */
export function createApiClient(options = {}) {
  const {
    baseURL = '/api/v1',
    getAccessToken = () => null,
    refreshSession = null,
    onSessionEnded = () => {},
    makeRequestId = defaultRequestId,
    timeoutMs = 20_000,
  } = options;

  const client = axios.create({ baseURL, timeout: timeoutMs });

  client.interceptors.request.use((config) => {
    if (!config.headers['X-Request-Id']) config.headers['X-Request-Id'] = makeRequestId();
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  /** @type {Promise<unknown> | null} */
  let inFlightRefresh = null;

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error?.config;
      const status = error?.response?.status;

      // `skipAuthRefresh` marks the refresh/logout calls themselves: retrying
      // a 401 with another refresh would deadlock the shared in-flight promise
      // (the refresh waiting on its own completion).
      if (
        status === 401 &&
        refreshSession &&
        original &&
        !original.__retriedAfterRefresh &&
        !original.skipAuthRefresh
      ) {
        original.__retriedAfterRefresh = true;
        try {
          if (!inFlightRefresh) {
            inFlightRefresh = refreshSession().finally(() => {
              inFlightRefresh = null;
            });
          }
          await inFlightRefresh;
          return client(original);
        } catch (refreshError) {
          onSessionEnded();
          throw toAppError(refreshError);
        }
      }

      const appError = toAppError(error);
      if (appError.status === 401) onSessionEnded();
      throw appError;
    },
  );

  return client;
}

function defaultRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export { AppError };
