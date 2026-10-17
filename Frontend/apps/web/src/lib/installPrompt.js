/**
 * Install-prompt state (Section 11 rule 8): the browser's `beforeinstallprompt`
 * event is captured here and offered **after a successful first punch** — never
 * on load. Logic lives outside the component so it is unit-testable without a
 * service worker; `shell/PwaUpdater.jsx` only renders the toasts.
 *
 * All storage access is guarded: a locked-down WebView with no localStorage
 * must degrade to "no flags", never to a thrown error.
 */

/** Set once the server confirms a punch on this device. */
const PUNCH_FLAG = 'swams.pwa.punched';
/** Timestamp of the last suppressed offer — a week of peace after "not now". */
const SUPPRESS_FLAG = 'swams.pwa.installSuppressed';
const SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000;

/** @type {{ prompt: () => Promise<void>, userChoice: Promise<{outcome?: string}> }|null} */
let deferredPrompt = null;
/** @type {Set<() => void>} */
const listeners = new Set();

const readFlag = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeFlag = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the offer simply reappears next session */
  }
};

const emit = () => {
  for (const listener of listeners) listener();
};

/** True when the app already runs as an installed (standalone) app. */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator?.standalone === true
  );
}

/** The server confirmed a punch — this device may now be offered the app. */
export function noteFirstPunch() {
  if (readFlag(PUNCH_FLAG) !== '1') writeFlag(PUNCH_FLAG, '1');
  emit();
}

/** @returns {boolean} a punch was confirmed on this device at some point */
export function hasPunched() {
  return readFlag(PUNCH_FLAG) === '1';
}

/** Capture the browser's deferred install prompt (never called by hand). */
export function captureInstallPrompt(event) {
  event.preventDefault();
  deferredPrompt = event;
  emit();
}

/**
 * Stop offering for this device for a week. Called when an offer is shown —
 * ignoring a toast counts the same as "not now". The deferred prompt is kept,
 * so the Install action on the visible toast still works.
 */
export function suppressFurtherOffers() {
  writeFlag(SUPPRESS_FLAG, String(Date.now()));
  emit();
}

/** @returns {boolean} an install offer may be shown right now */
export function canOfferInstall() {
  if (!deferredPrompt || isStandalone() || !hasPunched()) return false;
  const suppressedAt = Number(readFlag(SUPPRESS_FLAG) || 0);
  return !(suppressedAt > 0 && Date.now() - suppressedAt < SUPPRESS_MS);
}

/**
 * Show the browser's native install prompt.
 * @returns {Promise<'accepted'|'dismissed'|'unavailable'|'failed'>}
 */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    emit();
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    emit();
    return 'failed';
  }
}

/**
 * Subscribe to offer-eligibility changes (punch confirmed, prompt captured or
 * cleared, suppression recorded).
 * @param {() => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeOfferChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let wired = false;
/** Attach the browser listeners once. Idempotent; safe under StrictMode. */
export function initInstallPrompt() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('beforeinstallprompt', captureInstallPrompt);
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

/** Test-only: clear module state so specs stay order-independent. */
export function resetInstallPrompt() {
  deferredPrompt = null;
  wired = false;
  listeners.clear();
  try {
    window.localStorage.removeItem(PUNCH_FLAG);
    window.localStorage.removeItem(SUPPRESS_FLAG);
  } catch {
    /* nothing to clear */
  }
}
