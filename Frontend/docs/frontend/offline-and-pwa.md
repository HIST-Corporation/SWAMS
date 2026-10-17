# Offline and PWA

**Last verified:** 2026-10-13 · Owner: frontend · Scope: `apps/web` only (the marketing site and
the console are not installable apps).

FRONTEND_PROMPT §11 rule 8 is the binding spec. This document records what actually shipped.

## What exists

| Piece                                           | Where                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Manifest (standalone, en, SVG icons + maskable) | `apps/web/vite.config.js` → `dist/manifest.webmanifest`                    |
| Service worker (Workbox `generateSW`)           | same → `dist/sw.js` (prompt-driven, `skipWaiting: false`)                  |
| Registration + update/install toasts            | `apps/web/src/shell/PwaUpdater.jsx` (mounted once in `app/App.jsx`)        |
| Install-offer state (punch gate, suppression)   | `apps/web/src/lib/installPrompt.js` (+`installPrompt.test.js`)             |
| Offline punch queue persistence                 | `apps/web/src/features/attendance/queueStorage.js` (§7.2; shipped earlier) |
| Offline banner                                  | `shell/AppShell.jsx` (`window.online/offline` events)                      |

## Caching policy (deliberate, not default)

- **Precached:** the app shell only — js/css/html/svg/woff2 (97 entries at last build).
- **Never cached:** `/api/**` (`NetworkOnly`) — REST is truth (§5); the offline path is the punch
  queue, not stale reads. MSW's `mockServiceWorker.js` is excluded from the precache
  (`globIgnores` + `navigateFallbackDenylist`) so a stale mock worker can never outlive its mocks.
- **Navigation:** `navigateFallback: /index.html` (SPA), denied for `/api/` and the mock worker.
- **Dev:** `devOptions.enabled: false` — MSW owns `fetch` in dev; a second worker only worsens the
  controller flakiness already documented in `src/mocks/index.js`.

## Update flow

`registerType: 'prompt'`: a waiting worker never activates on its own. `PwaUpdater` shows a toast
("A new version is ready" → **Reload now** → `updateServiceWorker(true)`). This is why
`skipWaiting`/`clientsClaim` are `false` — an auto-swap mid-punch would be a data-loss footgun.

## Install flow

`beforeinstallprompt` is captured by `lib/installPrompt.js` and offered **only after the server
confirms a first punch** (`usePunch` → `noteFirstPunch()`), never on load. One offer per week per
device (`swams.pwa.installSuppressed`); `appinstalled` clears the deferral. All storage access is
guarded — a WebView with blocked `localStorage` degrades to "no offer", never to a thrown error.

## iOS, stated honestly (§11.8)

- `apple-touch-icon` is linked, but the repo ships **SVG only**; iOS wants a PNG. Until raster
  icons exist, iOS falls back to a screenshot. Not blocked on anything except an icon decision.
- No background sync, no push: iOS Safari PWA limits are designed around, not ignored (§11.8.9 —
  background geofence, biometrics, QR punch remain native-only-later items).

## Not in this slice

Push notifications (needs a `push` adapter + backend), periodic background sync, per-theme splash
screens (would need two manifests), and Web Share/haptics adapters — all later slices or
native-only (§11.3, §11.7, §11.9).
