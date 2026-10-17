# @swams/web — SWAMS app (Vite + React 19 PWA)

Staff / manager / HR areas. Structure follows Section 6 exactly:
`app/` (providers, router, nav config, guards, error boundary) · `routes/` (route tree only) ·
`features/*` (one folder per domain, template in Section 6.1) · `shell/` (AppShell, Sidebar,
Topbar, BottomNav) · `lib/` (apiClient, queryClient, keys) · `hooks/` · `mocks/` (MSW) · `styles/`.

## Commands

```bash
pnpm --filter @swams/web dev      # Vite dev server (MSW mocks on by default)
pnpm --filter @swams/web build    # production build
pnpm e2e                          # Playwright smoke (desktop 1280 + mobile 360)
```

- **Mocks:** MSW is on unless `VITE_API_URL` is set; `?mock=1` / `?mock=0` force it.
- **Theme:** pre-paint script in `index.html` (no flash), `ThemeProvider` from `@swams/ui`
  (Light / Dark / System, localStorage + `PATCH /me/preferences`, multi-tab + OS sync).
- **Nav:** one `app/nav.config.js` drives sidebar, bottom tabs and route guards
  (permission → entitlement → release). Locked items render an upgrade affordance, never a
  dead link; hidden items never leave empty groups.
- **States implemented:** shell loading (skeleton), session error (message + request ID +
  retry), offline banner, denied (`NoAccessPage`), 404 (`NotFoundPage`).

## Not built yet (build order)

Auth screens/session machine (2) · punch + offline queue (3) · corrections (4) · leave (5) ·
settings/roles (6) · dashboards/reports (7) · tasks/team/calendar/meetups (8) · messages/video/AI
(10) · command palette, org switcher, BS/AD topbar toggle, PWA service worker.

## Open decisions

`⚠️` map provider, video provider, Expo vs Capacitor — see `docs/FRONTEND_PROMPT.md` §19.
