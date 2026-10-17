/**
 * The console's OWN mock session (Section: application separation). This is a
 * separate auth realm from apps/web: a workforce session never grants console
 * access and vice versa. Development fixture only — the real console rides an
 * httpOnly session against the platform backend (contract request 31).
 */
const STORAGE_KEY = 'swams.console.session';

/** The seeded demo admin account the sign-in form autofills. */
export const DEMO_ADMIN = Object.freeze({ email: 'admin@swams.com', password: 'password' });

/** @returns {{ email: string, name: string, level: string } | null} */
export function readConsoleSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Validate the demo credentials and persist the mock session. */
export function startConsoleSession({ email, password }) {
  if (email !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) return null;
  const session = { email: DEMO_ADMIN.email, name: 'Demo Admin', level: 'owner' };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function endConsoleSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
