# SWAMS Frontend — Audit Report

**Date:** 2026-10-13 · **Method:** direct repository inspection, unit/component test runs, production build, and targeted browser verification of the mock personas. The initial structural audit (2026-10-10) lives in `repository-audit.md`; this report is the **current-state audit** and delta since then, per the master prompt's §3.

---

## 1. Current architecture (FACT)

Unchanged and verified: pnpm 11 + Turborepo 2 monorepo, JavaScript only (enforced by `scripts/check-js-only.mjs`), import boundaries enforced by `scripts/check-boundaries.mjs`.

| App              | Stack                    | Role                                  | State                                                                                                                           |
| ---------------- | ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`       | Vite 8 + React 19 PWA    | Workforce app (staff → executive)     | Feature-complete against MSW mocks; tests green                                                                                 |
| `apps/console`   | Vite 8 + React 19        | Platform administration (super admin) | **Was a single-page skeleton; now a real shell** with its own mock auth realm, four fixture-backed sections, en/ne, both themes |
| `apps/marketing` | Next.js 16 static export | Public site (en + ne)                 | Working; unchanged this session                                                                                                 |

Shared packages: `design-tokens`, `ui`, `i18n`, `domain`, `validation`, `permissions`, `api-client`, `config`. MSW serves OpenAPI-shaped mocks; TanStack Query owns server state; XState owns the session machine.

## 2. The six-role gap (FINDING → FIXED)

The prior model had five roles (`staff, manager, hr, owner, super_admin`), **no Team Lead/Supervisor**, no executive-vs-admin separation (super_admin held every permission, including all business data), and the dashboard only branched reviewer-vs-staff. Fixed this session:

- `team_lead` role + bundle added; `owner` reshaped to an executive lens (org-wide reads, billing, org settings — **no** people-admin, approvals or audit); `super_admin` reshaped to platform administration **only** (zero business data).
- `DATA_SCOPES` + `scopeFor()` added to `@swams/permissions`.
- Demo personas for all six roles (platform admin lives in the console): `aarav@swams.com` (CEO), `sarah@` (HR), `ramesh@` (Dept Manager), `anita@` (Team Lead), plus the four staff personas.
- Dashboard composition is now scope-driven: **org / team / personal** (`dashboardView`), so a supervisor never sees the org-wide board.
- Full matrix documented in `role-permission-matrix.md`; separation unit-tested (`Super Admin ≠ CEO`, `executive ≠ operator`).

## 3. Existing working features (verified this session)

- **Auth:** mock sign-in (two portals + persona cards for six roles), MFA path, session restore, route guards, no-access/not-found pages; 18 LoginPage tests green.
- **Shell:** permission-aware sidebar/bottom-nav from one config, command palette, theme (light/dark/system, persisted) and language (en/ne, persisted) toggles.
- **Dashboard:** three role-scoped compositions; session band, KPI row, org trend/department charts, workforce panel, insights, benchmark, staff board, team presence, needs-you queue — every widget owns loading/empty/error states.
- **Attendance:** punch machine (pre-flight policy, offline queue), history, month calendar, team board, corrections (request + reviewer queue).
- **Leave:** balance rail, validated request form, my-requests, reviewer approvals.
- **Tasks, calendar, messages, meetings, video, team directory, notifications, settings (incl. read-only six-role matrix), audit, onboarding wizard** — all present; messaging/meetings/video honestly labelled as previews (no transport/backend).
- **Marketing:** en/ne landing with animated product preview; static export builds.
- **Console:** sign-in gate → overview/organizations/accounts/health, all fixture-labelled.

## 4. Incomplete or mock-backed (FINDINGS — unchanged honesty)

- Messaging, meetings, video AI assistant, team meetup: labelled previews (local/sample only).
- Org dashboard analytics, benchmark, insights: contract request 25 (mocked + `PreviewNotice`).
- BS (Bikram Sambat) dates: AD-only rendering until a verified converter ships (contract request 1).
- **Department/team scoping is server-side work**: the mock `GET /org/dashboard` returns company-wide figures to every reviewer — recorded as **contract request 30**.
- **Console backend**: all sections are labelled fixtures — **contract request 31**.

## 5. Design, i18n, accessibility, responsiveness (FINDINGS)

- Token-driven styling throughout; no raw colors introduced; both themes verified by the existing E2E contrast audit.
- Catalog parity test now covers the new `console` namespace; all new strings (personas, roles, jobs, console) exist in **both** en and ne.
- New UI (persona cards, console) follows existing a11y patterns: native radios, labelled controls, `aria-current` nav, word+icon status, focus-visible rings.
- No new layout risks: the persona grid is the same 2-column pattern the staff cards already had; console tables scroll horizontally on narrow widths.

## 6. Routing, permissions, API (FINDINGS)

- Route tree unchanged; nav gating unchanged (`nav.config.js` + `can()`); the only composition change is `dashboardView` on Home.
- API boundary preserved: no feature fetches outside `api.js` + MSW; the console has **no** network layer at all yet (fixtures only, by design).
- Security limitation stated plainly: all frontend guards are UX over fixtures; production security requires backend enforcement (contract 30/31).

## 7. Tests, build, tooling (measured this session)

| Check                    | Result                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`              | **701 passed / 701** (69 files) — was 680/680                                                                               |
| `pnpm lint`              | clean (ESLint + JS-only + boundaries)                                                                                       |
| `pnpm format:check`      | clean (after repo-wide Prettier write; 151 pre-existing violations fixed)                                                   |
| `pnpm build`             | **4/4 tasks successful** (web, console, marketing, tokens)                                                                  |
| Pre-existing build notes | >400 kB chunk warning (web, recharts-laden) and an ineffective dynamic import of `NoAccessPage` — both predate this session |

## 8. Recommended priorities (next)

1. **Backend:** implement contract 30 (scope-aware payloads) then 31 (platform console API); until then no claim of production readiness.
2. Wire the console to contract 31 with real auth; retire `apps/console/src/session.js` mock.
3. BS date conversion (contract 1) once a verified library is approved.
4. Employee directory/profile deep-link polish once a real people API exists (the team directory is the current stand-in).
5. Code-split the >400 kB web chunk when recharts is re-evaluated.
