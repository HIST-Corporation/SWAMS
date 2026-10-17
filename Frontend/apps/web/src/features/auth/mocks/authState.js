/**
 * Mutable auth state for the MSW auth mock (slice 2).
 * MOCK ONLY — emulates the real httpOnly-cookie session: the token is kept
 * in sessionStorage so a reload still restores the session, exactly like the
 * refresh cookie would. Never presented as production behavior.
 */
const STORAGE_KEY = 'swams.mock.auth';

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
  } catch {
    /* private mode: in-memory only */
  }
}

export const authState = {
  /** Access token issued by the mock login; `null` = signed out. */
  token: null,
  /** Set when login returned `mfaRequired` and /auth/mfa is awaited. */
  pendingMfa: null,
  /** Which fixture session the token represents ('hr' | 'staff'). */
  sessionKey: 'hr',
  /** Portal picked before an MFA challenge, applied after verification. */
  pendingPortal: 'hr',
  ...load(),
};

/** Single mutation point so every write also persists (reload survival). */
export function setAuth(patch) {
  Object.assign(authState, patch);
  persist();
}

export function resetAuthState() {
  setAuth({ token: null, pendingMfa: null });
}

/** Mimics bearer-token checking so a signed-out app really gets 401s. */
export function isAuthorized(request) {
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${authState.token}`;
}
