/**
 * Access-token holder (Section 5): memory only — never localStorage, never a
 * cookie. Refresh happens through the httpOnly cookie via `refreshSession`.
 * One tiny store so `apiClient.getAccessToken` and the session machine agree.
 */

/** @type {{ token: string | null }} */
const state = { token: null };

/** @type {Set<() => void>} */
const sessionEndedListeners = new Set();

export function getAccessToken() {
  return state.token;
}

/** @param {string} token */
export function setAccessToken(token) {
  state.token = token;
}

export function clearAccessToken() {
  state.token = null;
}

/** apiClient calls this on 401-after-refresh; the session machine listens. */
export function onSessionEnded(listener) {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

export function emitSessionEnded() {
  for (const listener of sessionEndedListeners) listener();
}
