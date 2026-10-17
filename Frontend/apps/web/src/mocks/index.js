/**
 * Mock switch (Section 5, mock-first development).
 * Default: mocks ON when no VITE_API_URL is configured.
 * `?mock=1` always forces mocks on; `?mock=0` or `VITE_MOCK=0` forces them off.
 */
export function shouldUseMock(search = window.location.search, env = import.meta.env) {
  const params = new URLSearchParams(search);
  if (params.get('mock') === '1') return true;
  if (params.get('mock') === '0') return false;
  if (env.VITE_MOCK === '0') return false;
  if (env.VITE_MOCK === '1') return true;
  return !env.VITE_API_URL;
}

/**
 * MSW registers the page with its service worker once, when `start()` runs, and
 * the worker forgets that registration the moment the browser terminates it —
 * which happens whenever the page sits in the background or occluded long
 * enough (MSW's 5 s keepalive is throttled past the browser's idle timeout).
 * After that every request falls through to the dev server, so each mock
 * endpoint answers 404/HTML and sign-in fails with "that email or password
 * didn't match" until a reload.
 *
 * Re-arm on the way back to the foreground: the worker's own message handler
 * accepts `MOCK_ACTIVATE` and adds the client back to its active set (verified
 * against public/mockServiceWorker.js). Mock-only — never wired for a real API.
 */
export function rearmMockWorkerOnVisible({
  target = document,
  worker = navigator.serviceWorker,
} = {}) {
  if (!worker) return () => {};

  // The controller is read at re-arm time, not at setup time: the listener is
  // cheap, and a worker that attaches later still gets re-armed.
  const rearm = () => {
    if (target.visibilityState !== 'visible') return;
    worker.controller?.postMessage('MOCK_ACTIVATE');
  };

  target.addEventListener('visibilitychange', rearm);
  return () => target.removeEventListener('visibilitychange', rearm);
}

/** Start the MSW browser worker (no-op outside the browser). */
export async function startMocking() {
  const { worker } = await import('./browser.js');
  await worker.start({ onUnhandledRequest: 'bypass' });
  if (typeof document !== 'undefined') rearmMockWorkerOnVisible();
  return worker;
}
