/**
 * Public origin of the web app, used for every "live demo" link (Section 13).
 * Public by definition — no secrets, just a NEXT_PUBLIC_ var with a local
 * default so `pnpm dev` works out of the box.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173';

/**
 * Where the site's demo actions open the sign-in page: its own dedicated URL
 * (`/demo` on the web app) so a first-time visitor lands on a demo-flavoured
 * entry, separate from the generic `/login` (§7.3). Falls back to the app root
 * when the env var is unset.
 */
export const DEMO_URL = `${APP_URL.replace(/\/$/, '')}/demo`;

/**
 * Where the site's "Sign in" action opens the app's login page: its own URL
 * (`/login` on the web app) so the session machine takes over (§7.3).
 * Always opened with `target="_blank"` so the landing page stays open.
 */
export const SIGN_IN_URL = `${APP_URL.replace(/\/$/, '')}/login`;
