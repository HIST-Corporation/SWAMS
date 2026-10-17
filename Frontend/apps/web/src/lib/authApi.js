import { api } from './apiClient.js';
import { clearAccessToken, getAccessToken, setAccessToken } from './authStore.js';

/** Detect whether the current page is expected to be served by the MSW browser worker. */
export function isUsingMockWorker() {
  if (typeof navigator === 'undefined' || !navigator?.serviceWorker) return false;
  try {
    return !!navigator.serviceWorker.controller;
  } catch {
    return false;
  }
}

/**
 * Auth endpoints consumed by the session machine (slice 2, contract row 4).
 * The access token is kept in memory via authStore; the refresh cookie is
 * httpOnly and sent automatically (withCredentials) by the refresh/logout calls.
 */

/**
 * @param {{ email: string, password: string, portal?: 'staff'|'hr' }} credentials
 * @returns {Promise<{ mfaRequired: true } | { accessToken: string, session: object }>}
 */
export async function signIn(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  if (data.mfaRequired) return { mfaRequired: true };
  setAccessToken(data.accessToken);
  return data;
}

/** @param {{ code: string, portal?: 'staff'|'hr' }} challenge */
export async function verifyMfa(challenge) {
  const { data } = await api.post('/auth/mfa', challenge);
  setAccessToken(data.accessToken);
  return data;
}

/**
 * Request a password-reset link (login screen's forgot-password view,
 * contract request 16). Enumeration-safe: the server answers the same way
 * whether or not the account exists, and this never touches the session.
 * @param {{ email: string }} payload
 * @returns {Promise<{status: 'sent'}>}
 */
export async function requestPasswordReset(payload) {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
}

const MAX_WAIT_FOR_MOCK_WORKER_MS = 8_000;

/**
 * Restore (or extend) the session via the httpOnly cookie. Used on boot and
 * on `expiring → refreshing`. Sends the current bearer token when we have one
 * so the mock can distinguish signed-in from signed-out.
 *
 * On mock-first boot the worker may not have claimed the page yet (the page
 * can outrun `window.navigator.serviceWorker.controller`). A boot refresh that
 * misses the worker would look like a hard auth failure and bounce the user to
 * login. To avoid that, when the app is under MSW we wait briefly for the
 * worker to control the page before issuing the restore request.
 * @returns {Promise<{ session: object }>}
 */
export async function refreshSession() {
  await waitForMockWorkerIfBootRestore();

  const token = getAccessToken();
  const { data } = await api.post('/auth/refresh', null, {
    withCredentials: true,
    // Never let the interceptor refresh on a refresh (shared-promise deadlock).
    skipAuthRefresh: true,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  // The refresh rotates the access token (kept in memory only).
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data;
}

/**
 * Boot restore must not be issued while the mock worker has started but does
 * not yet control this page: those requests bypass the worker and look like a
 * hard session failure. `MSW` claims the page a moment after `worker.start()`,
 * so we wait (bounded) only when a service worker registration actually exists
 * — a real API, or a browser with no worker, is never delayed.
 */
let controllerWait = null;

async function waitForMockWorkerIfBootRestore() {
  if (typeof navigator === 'undefined' || !navigator?.serviceWorker?.controller) {
    if (typeof navigator === 'undefined' || !navigator?.serviceWorker) return;
    const registration = await navigator.serviceWorker.getRegistration().catch(() => null);
    if (!registration) return;
  } else {
    return;
  }

  if (navigator.serviceWorker.controller) return;
  if (!controllerWait) {
    controllerWait = new Promise((resolve) => {
      let timer = null;
      const finish = () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('controllerchange', finish);
        }
        if (timer) clearTimeout(timer);
        controllerWait = null;
        resolve();
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('controllerchange', finish);
      }
      timer = setTimeout(finish, MAX_WAIT_FOR_MOCK_WORKER_MS);
    });
  }
  return controllerWait;
}

export async function signOut() {
  try {
    // Ending the session must not trigger another refresh either.
    await api.post('/auth/logout', null, { withCredentials: true, skipAuthRefresh: true });
  } finally {
    clearAccessToken();
  }
}
