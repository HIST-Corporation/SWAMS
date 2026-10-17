# SWAMS Frontend — Repository Audit

**Date:** 2026-10-10 · **Auditor:** Frontend agent · **Method:** direct inspection of the running repo, both prototype HTML files, and the app in a real browser.

This audit answers the §2 requirements of the master prompt. Facts are separated from assumptions.

---

## 1. Current technology stack (FACT)

| Area              | Choice                                                                       | Where                                              |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Package manager   | pnpm 11.22 workspaces + Turborepo                                            | `pnpm-workspace.yaml`, `turbo.json`                |
| Language          | JavaScript (ES2023), no TypeScript                                           | enforced by `scripts/check-js-only.mjs`            |
| Authenticated app | Vite 8 + React 19 PWA                                                        | `apps/web`                                         |
| Marketing site    | Next.js 16 static export (SSG)                                               | `apps/marketing`                                   |
| Routing           | React Router data router, lazy routes                                        | `apps/web/src/routes/index.jsx`                    |
| Styling           | Tailwind via a design-token CSS-variable preset                              | `packages/design-tokens`                           |
| Icons             | `lucide-react` (single icon set)                                             | throughout                                         |
| Server state      | TanStack Query                                                               | feature `hooks/`                                   |
| Workflow state    | XState v5                                                                    | punch, correction, session, offline-queue machines |
| HTTP              | axios wrapper with refresh-on-401                                            | `packages/api-client`                              |
| i18n              | i18next, English + Nepali, per-feature namespaces                            | `packages/i18n`                                    |
| Mocking           | MSW (browser worker + `msw/node` in tests)                                   | `apps/web/src/mocks`, per-feature `mocks/`         |
| Tests             | Vitest + Testing Library                                                     | 33 test files                                      |
| Lint              | ESLint flat config (a11y, hooks, boundaries, no-raw-string/color) + Prettier | `packages/config/src/eslint.js`                    |

## 2. Application structure (FACT)

Two apps, eight shared packages, docs, and a read-only prototype folder:

```
apps/web          Vite PWA — staff / manager / HR experience
apps/marketing    Next static export — public site, en + ne
packages/design-tokens | ui | i18n | domain | validation | permissions | api-client | config
docs/             FRONTEND_PROMPT (binding), design/, adr/, api-contract/, frontend/
design-prototype/ read-only copies of SWAMS_Unified.html and SWAMS_Landing.html
```

Feature folders follow one template (`index.js` public API, `pages/`, `components/`, `hooks/`, `machines/`, `api.js`, `mocks/`, `README.md`). Features present: `auth`, `onboarding`, `dashboard`, `attendance`, `leave`, `team`, `meetings`, `messages`, `video`.

## 3. Existing working functionality (FACT — verified in a browser this session)

- **Auth:** mock sign-in (staff / HR portal picker), MFA challenge path, session restore via refresh, protected routes, "no access" and "not-found" pages.
- **App shell:** sidebar with grouped, permission-aware nav (9 enabled items), topbar, mobile bottom tabs, command palette, theme + language toggles.
- **Dashboard:** greeting, punch hero, tinted stat rail (this week + leave left), "Needs you" approvals band, today's tasks, team presence strip.
- **Attendance:** punch machine with pre-flight policy, offline queue, history list, correction request + reviewer queue.
- **Leave:** balance rail, request form (validated), my-requests list, reviewer approval queue. **Built and browser-verified this session.**
- **Team / Meetings / Video / Messages:** rendered from labelled sample data behind an explicit `PreviewNotice`.
- **Marketing:** hero with an animated product preview, eight modules, three-step workflow, HR-vs-staff panels, indicative pricing, en/ne, light/dark.

## 4. Routes and navigation (FACT)

`/login`, `/setup`, `/` (dashboard), `/attendance`, `/attendance/history`, `/attendance/corrections`, `/leave`, `/team`, `/messages`, `/meetings`, `/video`, `/meetup`, `/more`, `/no-access`, `*` (not-found). Navigation is driven by a single config (`nav.config.js`) carrying `requires.permission`, `requires.entitlement`, and `release`; hidden items never leave empty groups.

## 5. API integration (FACT)

A single axios client (`packages/api-client`) sets request IDs, attaches the in-memory bearer token, and shares one in-flight refresh so queued 401s never deadlock. Components never call `fetch`; hooks call `api.js` per feature. MSW serves the contract until the backend exists. Endpoints the UI needs but the backend contract lacks are logged in `docs/api-contract/contract-requests.md` — never invented silently.

## 6. Authentication and authorization (FACT)

Access token in memory only; refresh rides an httpOnly cookie (mocked). Route guard → permission → entitlement. `packages/permissions` exposes `can()` and role bundles. **Frontend guards are UX only; the backend remains the real gate** (stated in code comments and docs).

## 7. Reusable components (FACT)

Primitives: Button, IconButton, Input, Textarea, Checkbox, Switch, Badge, Avatar, Skeleton. Patterns: FormField, EmptyState, ErrorState, StatTile, PreviewNotice, CommandPalette, Stepper. All token-driven, keyboard-operable, with stories/tests for the core ones.

## 8–10. UI, accessibility and responsive problems (FINDINGS)

Resolved during the build: added a `HydrateFallback` (was a blank first paint + React warning); every data screen carries loading/empty/error/denied states; a11y is enforced by `jsx-a11y` plus focus-visible rings, semantic landmarks, and `aria-live` status regions. Both themes and 360/768/1280 widths are the project's stated verification gate.

Remaining, documented honestly:

- The BS (Bikram Sambat) half of dual dates is **AD-only** until a verified BS converter is adopted (contract request 1). No inaccurate conversion is shipped.
- Messaging / meetings / video are **labelled previews** — no real-time or media backend exists, so they never claim to be live.

## 11. Technical debt and duplication (FINDING)

Low and actively policed. Boundaries (feature→feature only via `index.js`, packages never import apps) are enforced in CI; file/function length limits, no raw colors/strings, and dead-code checks (`knip`) run in the pipeline. A `PreviewNotice` pattern prevents sample data from masquerading as production.

## 12. Missing frontend functionality (FACT)

Screens gated behind missing backend contracts (`enabled: false` in nav): task board, projects, leave requests-queue view, calendar, reports, analytics, AI, settings, billing, audit. Each is inventoried with its required API in `docs/design/screen-inventory.md`.

## 13. Risks (ASSESSMENT)

- **Backend dependency:** every gated screen is blocked on OpenAPI landing, not on frontend work.
- **Claim discipline:** the main product risk is marketing copy outrunning the build. Mitigated — the AI module is the only forward-looking claim and pricing is explicitly labelled indicative.
- **BS dates:** shipping an unverified converter would be worse than AD-only; deliberately deferred.

## 14. Recommended implementation strategy (OPINION — already largely executed)

Vertical slices (screen + states + tests + docs) against the mock contract, verifying in a real browser in both themes and three widths before calling a slice done. The next highest-value work is backend-contract-driven: land OpenAPI, then enable the gated screens one slice at a time.

---

**Assumptions recorded:** (1) the two prototype HTML files are design references, not requirements; (2) MSW fixtures are development-only and never presented as production data; (3) frontend permission checks are usability, not security. No user changes were overwritten; the repo has no git commits yet, so nothing was discarded.
