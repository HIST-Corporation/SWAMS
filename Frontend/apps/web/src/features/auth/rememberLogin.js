/**
 * "Remember me" storage (Section 8.3): email + portal only, in localStorage.
 * The session lifetime itself stays with the server — remembering never
 * extends a sign-in.
 */
const REMEMBER_KEY = 'swams.remember';

/** @returns {{ email: string, portal: 'hr'|'staff', persona?: string } | null} */
export function readRemembered() {
  try {
    return JSON.parse(window.localStorage.getItem(REMEMBER_KEY)) ?? null;
  } catch {
    return null;
  }
}

/** @param {{ email: string, portal: 'hr'|'staff', persona?: string }} value */
export function rememberMe(value) {
  window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(value));
}

export function forgetMe() {
  window.localStorage.removeItem(REMEMBER_KEY);
}
