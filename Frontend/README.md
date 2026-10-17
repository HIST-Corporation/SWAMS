# SWAMS — Smart Workflow & Attendance Management System

Frontend monorepo (pnpm + Turborepo) — staff/manager/HR app, a public marketing
landing, and an admin console. Built for Nepal's SMEs: BS/AD dates, Nepali +
English, both light and dark themes. This single `README.md` is the master
documentation — architecture, design system, information architecture, the
feature inventory, and the full changelog of what has been built and modified.

---

## 1. Quick start

```bash
pnpm install          # one time — installs all workspace projects
pnpm dev              # turbo run dev — starts every app below
```

| App                                             | Local URL                 | Command                              |
| ----------------------------------------------- | ------------------------- | ------------------------------------ |
| Web app (staff/manager/HR, Vite + React 19 PWA) | **http://localhost:5173** | `pnpm --filter @swams/web dev`       |
| Admin console (platform admin)                  | **http://localhost:3001** | `pnpm --filter @swams/console dev`   |
| Marketing site (Next.js static export)          | **http://localhost:3000** | `pnpm --filter @swams/marketing dev` |

- Web app dev server runs at `:5173`; console at `:3001` (separate auth realm);
  marketing at `:3000`.
- Local dev uses `.env.local` (copy of `.env.example`) — an empty `VITE_API_URL`
  turns on the MSW mock server (mock-first). `.env` / `.env.*` are gitignored.
- Run everything individually with `pnpm --filter @swams/<pkg> dev`.

### First visit vs. returning visit

The app root `/` is a **gate**, not the dashboard:

- **First visit (no session)** → `RootRedirect` sends the visitor to the public
  **`/landing`** marketing page.
- **After sign-up / sign-in** → the session machine authenticates and the user
  lands directly on **`/dashboard`**.
- **Second visit onwards** → the refresh cookie marks a returning visit, so the
  gate sends a signed-in session straight to `/dashboard`. There is no
  first-visit flag stored anywhere — "returning" is exactly the session state,
  so it cannot be faked from the client.

### Demo credentials

**Mock sign-in is on by default** — there is no backend. Any valid email + a
password of 8+ characters works. The login screen autofills the demo account
for the selected role; press **Sign in**.

| Role card                    | Email              | Password   | Application           |
| ---------------------------- | ------------------ | ---------- | --------------------- |
| Executive (CEO)              | `aarav@swams.com`  | `password` | apps/web              |
| HR / Manager (HR)            | `sarah@swams.com`  | `password` | apps/web              |
| Dept. Manager                | `ramesh@swams.com` | `password` | apps/web              |
| Team Lead                    | `anita@swams.com`  | `password` | apps/web              |
| Staff (Frontend)             | `priya@swams.com`  | `password` | apps/web              |
| Staff · Backend              | `james@swams.com`  | `password` | apps/web              |
| Staff · QA                   | `tina@swams.com`   | `password` | apps/web              |
| Staff · DevOps               | `raj@swams.com`    | `password` | apps/web              |
| Platform admin (super admin) | `admin@swams.com`  | `password` | **apps/console only** |

The six core roles live in `packages/permissions` (`staff`, `team_lead`, `manager`, `hr`,
`owner` = executive, `super_admin` = platform). Platform administration and executive
authority are separate: the console admin holds no business-data permissions, and the
CEO holds none of the technical-admin ones — see
`docs/frontend/role-permission-matrix.md`.

**MFA demo** (triggers the 6-digit step): `mfa@himaldigital.com.np` / any 8+
characters / any 6 digits.

Credentials live in `apps/web/src/features/auth/mocks/handlers.js`; the demo
people live in `apps/web/src/mocks/roster.js`. The org is **Himal Digital Pvt.
Ltd.** (timezone `Asia/Kathmandu`, fiscal year starts 07-16).

---

## 2. Commands

| Command                  | What it do                                         |
| ------------------------ | -------------------------------------------------- |
| `pnpm dev`               | Turborepo: start all apps                          |
| `pnpm build`             | Turborepo build of every app/package               |
| `pnpm test`              | Vitest across all packages/apps (unit + component) |
| `pnpm lint`              | ESLint + JS-only guard + import-boundary guard     |
| `pnpm format`            | Prettier write                                     |
| `pnpm format:check`      | Prettier check                                     |
| `pnpm e2e`               | Playwright smoke + contrast audit (`apps/web/e2e`) |
| `pnpm gen:feature <n>`   | Scaffold a feature folder (Section 6.1 template)   |
| `pnpm gen:component <C>` | Scaffold a UI component + story + test             |

---

## 3. Architecture & information architecture

### Monorepo layout

```
apps/
  web/          Vite + React 19 PWA (staff/manager/HR) — routing, auth gate, landing
  console/      separate Vite admin app (platform admin)
  marketing/    Next.js static export (en + ne)
packages/       shared, DOM-free:
  design-tokens/  CSS variables + Tailwind preset (single source of color/type/space)
  ui/             React primitives + patterns (Button, Card, StatTile, ThemeToggle)
  i18n/           message catalogs (en + ne), formatters, i18next factory
  domain/         pure logic (worked minutes, overtime, BS/AD date parts, leave math)
  validation/     Zod schemas
  permissions/    permission keys + per-role bundles
  api-client/     the one fetch layer (apiClient) every feature goes through
  config/         shared ESLint config
```

**Boundaries (enforced by `pnpm lint` → `scripts/check-boundaries.mjs`):**
features import only another feature's `index.js`; packages never import apps;
apps never import each other; shared packages stay DOM-free.

### Route tree (`apps/web/src/routes/index.jsx`)

```
/login                    public — login + MFA flow (no app chrome)
/landing                  public — marketing landing (first visit)
/                         gate — RootRedirect: session -> /dashboard, guest -> /landing
/setup                    RequireAuth + settings.manage — org setup wizard
/  (AppShell, RequireAuth)
  /dashboard              home (role-aware)
  attendance              today (punch card, shift strip, week strip, month calendar)
  attendance/history      paged history
  attendance/team         manager/HR board
  attendance/corrections  request + reviewer queue
  leave · settings · audit · reports · analytics · tasks · calendar
  messages · meetings · video · team · meetup · more · no-access · *
```

### State ownership (Section 5)

- **Server data** → TanStack Query, one query-key factory per feature
  (`hooks/keys.js`). The client never recomputes a server number.
- **Auth/session** → XState session machine (`features/auth/machines`), rendered
  from `status` via `useAuth()`; `RequireAuth`/`RequirePermission` are the guards.
- **UI state** → React Router URL (filters, tabs, selected id) and zustand
  stores (`stores/ui.js`, `stores/presence.js`).

### Theming & language

- Theme: `ThemeProvider` in `packages/ui`, persisted under `swams.theme`, three
  options (Light / Dark / System). The landing page wraps itself in its own
  `ThemeProvider` so it is self-contained outside the app shell.
- Language: `initI18n` at boot from `@swams/i18n`, restored from `swams.language`;
  `en` + `ne` catalogs must stay key-identical (parity test).

---

## 4. Design system

### Principles (from the binding contract)

- **Tokens, not literals.** No raw colors or px in feature code; every value is
  a CSS variable / Tailwind token.
- **i18n everywhere.** en + ne; every user-visible string is an i18n key. The
  catalog parity test fails if a key is added to one locale only.
- **Both themes, three widths** (360 / 768 / 1280) — checked light **and** dark.
- **States before happy path:** loading (skeleton), empty, error (request id +
  retry), denied, offline.
- **Motion answers an action** and respects `prefers-reduced-motion`.
- **Color never carries meaning alone** — a word or icon always accompanies it.
- **File ≤ 250 lines, component ≤ 180 lines.**
- **No fake integrations.** Mocks are labeled; never presented as production.

### Color tokens (both themes)

Every color is a CSS variable (`packages/design-tokens/css/tokens.css`) exposed
through the Tailwind preset. Base: `bg` · `surface` · `surface-raised` ·
`surface-sunken` · `border` · `border-strong` · `text` · `text-muted` ·
`text-faint`. Brand: `brand` (+`brand-text`/`brand-soft`), `primary`
(+`primary-strong`/`primary-soft`/`on-primary`), `accent`. Status (soft + text
pairs): `success` · `warning` · `danger` · `info` · `violet` · `rose`. Chart and
chip tints: `chart-indigo/teal/marigold/violet/rose`, `chip-indigo/teal/
marigold/violet/rose` (+`-fg`). Stage (video room): `stage` · `stage-raised` ·
`stage-border` · `stage-text` · `stage-muted`.

### Type

Display face `Syne` (`font-display`), body `DM Sans`, numerics `tabular` + `DM
Mono`. Sizes `xs/sm/base/md/lg/xl/2xl/3xl`. Reading measure `max-w-reading`.

### Space, radius, shadow, motion, z

Radii: `rounded-input` · `rounded-button` · `rounded-card` · `rounded-hero` ·
`rounded-pill`. Shadows: `shadow-1` · `shadow-2`. Durations: `duration-feedback`
(120ms) · `duration-reveal` (200ms) · `duration-sheet` (320ms), easing
`ease-standard`. z-index: `sticky` · `dropdown` · `sheet` · `modal` · `toast`.

### Component kit (`packages/ui`)

- **Primitives:** Button (primary/secondary/quiet/danger/success · sm/md/lg ·
  loading), IconButton, Input, Textarea, Checkbox, Switch, Badge (tone per
  status), Avatar (hue + presence dot), Skeleton.
- **Patterns:** FormField, Card/CardTitle/PageHeader, EmptyState, ErrorState,
  PreviewNotice, StatTile, Stepper, CommandPalette.
- **Theme:** ThemeProvider + ThemeToggle. **Feedback:** ToastProvider/useToast.

### Iconography

`lucide-react` throughout. Icons are decorative (`aria-hidden`); the label
beside them carries the meaning. Status dots are paired with a word.

---

## 5. i18n (Section 8.10)

Per-feature namespaces live in `packages/i18n/locales/{lng}/<ns>.json`:
`common` (default) · `nav` · `attendance` · `dashboard` · `messages` ·
`meetings` · `team` · `video` · `leave` · `marketing` · `notifications` ·
`settings` · `audit` · `reports` · `tasks` · `calendar`. Formatters
(`@swams/i18n`): `formatClock` (Nepal wall-clock), `formatDuration`,
`formatPercent`, `formatDateAd`, `nepalParts`. Numbers that must read in Nepali
digits are full strings in the `ne` catalog (e.g. hero facts).

---

## 6. Feature inventory (`apps/web/src/features`)

- **auth** — session machine, login/MFA/forgot, role + persona pickers, brand
  panel, "remember me".
- **marketing** — the public `/landing` page (Header, Hero + ProductPreview,
  Modules, CodeShowcase, Workflow, Roles, Pricing, DemoCta, Footer, LanguageSwitch, `useReveal`).
- **dashboard** — role-aware Home, session band, KPI row, org/staff boards,
  presence + status picker, charts, benchmark, insights, needs-you.
- **attendance** — punch card + shift strip, timer ring, week strip, month
  calendar, history, team board, corrections (request + reviewer queue).
- **video** — call room: stage, filmstrip, three-zone control bar (devices,
  record, centered Leave), invite panel, AI assistant rail tab, real device
  toggles.
- **messages** — roster staff list with availability dots, per-person threads,
  local composer.
- **analytics / reports** — org summaries + the `/analytics` week/month/year
  progress view.
- **leave · tasks · calendar · meetings · team · meetup · notifications ·
  settings · audit · onboarding**.

### Mock-first data layer

No backend. MSW serves the OpenAPI-shaped contract in each feature's `mocks/`.
New/changed endpoints are recorded in `docs/api-contract/contract-requests.md`
and asserted by `handlers.test.js`. Every mock is labeled as a fixture — the UI
says so out loud (`PreviewNotice`) rather than posing as live data.

---

## 7. Testing

- **Unit/component:** Vitest (`pnpm test`) — 67 files, 680 tests. Component
  tests opt into jsdom via `// @vitest-environment jsdom`; `tests/setup.js` adds
  jest-dom matchers. Catalog parity and every feature handler contract covered.
- **E2E:** Playwright (`pnpm e2e`) — sign-in smoke, theme persistence, console
  cleanliness, dashboard parity, calendar, and a WCAG contrast/visibility audit
  across product pages in both themes and widths.
- **Guards:** `pnpm lint` (ESLint + JS-only + boundaries) must be clean.

---

## 8. Changelog — everything built & modified

### Six-role model, scoped dashboards & platform console (2026-10-13)

- **Six core roles** in `@swams/permissions`: added `team_lead` (supervisor:
  team approvals + task coordination, no people-admin); reshaped `owner` into
  the executive lens (org-wide reads + billing + org settings, no approvals or
  people-admin) and `super_admin` into platform administration **only** (zero
  business data). `Super Admin ≠ CEO` and `executive ≠ operator` are unit
  tests, not just docs (`packages/permissions/src/permissions.test.js`).
- **Data scopes:** new `DATA_SCOPES` + `scopeFor()` in `@swams/permissions`
  (self / team / department / organization / platform).
- **Dashboard:** Home now composes from `dashboardView(principal)` — org
  (executive/HR/manager), team (supervisor: personal widgets + Team now +
  Needs-you, never org-wide panels), personal (staff).
- **Six demo personas** on the login screen: management portal cards
  (Executive / HR / Dept. Manager / Team Lead) beside the staff personas;
  generic `LoginPersonaPicker` replaces the staff-only picker. New fixture
  sessions: `aarav@` (CEO), `ramesh@` (manager), `anita@` (team lead).
- **Platform console** (`apps/console`): from a one-page skeleton to a real
  shell — own mock auth realm (`session.js`, `admin@swams.com` / `password`),
  sign-in gate, sidebar sections (Overview, Organizations, Admin accounts,
  System health), en/ne (`console` namespace), both themes, honest
  fixture banner, 4 component tests.
- **Docs:** `docs/frontend/audit-report.md`, `design-system.md`,
  `role-permission-matrix.md`; contract requests **30** (scope-aware
  payloads) and **31** (platform console API) recorded.
- **Quality gates re-run:** 701/701 tests (69 files), lint clean, Prettier
  clean (repo-wide reformat of 151 pre-existing violations), build 4/4.

### Local browser readiness

- Diagnosed a Vite server started from the repo root (404 at `/`); created
  `.env.local` (mock-first) and start apps via the documented filters. Verified
  all three apps in a real browser (light/dark, en/ne).

### Attendance

- **Month calendar** (`MonthCalendar` + `GET /attendance/calendar`, contract 27):
  present/absent/late/leave/holiday tints, worded legend, prev/next month,
  future days as "upcoming". Days in the history window reuse that window's rows
  so calendar and history never disagree.
- **Shift strip** (`ShiftStrip`): arranges `General 09:00–17:30` — start, end,
  length, expected-out while running.
- **Timer ring** fill animation from clock-in toward the shift target.
- **UI polish:** Team attendance (icon KPI tiles + column headers), History
  (column headers + calendar link), Corrections (side-by-side on desktop).

### Dashboard

- **Today's session band** (`SessionBand`): live `HH:MM:SS` since clock-in,
  clock-in time, site, expected-out, shift; "Clock in now" empty state.
- **Presence status picker** (`StatusPicker` + `stores/presence.js`):
  online/busy/away/offline, persisted; `busy` added to roster + both catalogs;
  TeamNow shows availability words beside avatars.
- **Layout:** paired cards use `items-stretch` so rows align without ragged gaps.

### Messages

- Roster-driven staff list with **avatar status dots** (online/busy/away/offline
  in words); clicking an avatar opens that person's thread. Per-person threads.
- **Working composer** appends to the local thread with an honest "stays in this
  browser" note (no transport yet — contract 10).

### Video call

- **Three-zone control bar:** devices (mic, camera, share, **record**) left,
  **Leave centered**, panel/fullscreen right.
- **Local recording** (`useRecorder`, real `MediaRecorder` over the mic;
  disabled unless mic on; stops if the mic stops).
- **Invite only the required people** (`InvitePanel` + `POST /notifications`,
  contract 29): real call-request notification into the bell; row flips to
  "Request sent".
- **Clearer rail tabs** that wrap and keep a visible **minimize** button.
- **AI meeting assistant tab** (`AiPanel`): mic-aware capture indicator,
  speaker-attributed sample transcript streaming live, running brief,
  conclusion — all labeled sample.

### Insights / analytics

- **`/analytics`** enabled in nav + new `AnalyticsPage`: Week/Month/Year toggle,
  KPI tiles, lazy Recharts rate curve + hours bars (gaps, never faked zeros),
  worded day breakdown, sr-only tables, `PreviewNotice`. Backed by
  `GET /reports/analytics` (contract 28) from one payload.

### Calendar (`/calendar`)

- Day cells tinted by what they hold — **holiday (red) → meeting (blue) → leave
  (teal)**, ordinary **office days (brand tint)** instead of plain white,
  weekly-off muted. Words always accompany color.

### Landing page + first-visit routing

- New `features/marketing` ported from `design-prototype/SWAMS_Landing.html`:
  sticky header (brand, anchors, language + theme, Sign in), hero with painted
  underline + facts + industries, animated product preview, 8-module bento, 3 steps,
  HR/Staff role cards, pricing (NPR 499/899), CTA band, footer. Tokens-only,
  en + ne, both themes, 360/768/1280, scroll-reveal honoring reduced motion.
- **`RootRedirect`** gate at `/`: session → `/dashboard`, guest → `/landing`.
  E2E updated to open `/login` directly.

### Documentation & contracts

- Contract requests **27** (attendance calendar), **28** (reports analytics),
  **29** (call requests) recorded in `docs/api-contract/contract-requests.md`.
- This master `README.md` consolidates the design system, information
  architecture, and the changelog in a single file.

---

## 9. Non-negotiables (short form)

- **JavaScript only.** No `.ts` files.
- **Tokens, not literals.** No raw colors / px / user-visible strings in feature code.
- **i18n everywhere.** English + Nepali; BS/AD dates via `packages/i18n`.
- **Both themes, three widths** (360 / 768 / 1280).
- **States before happy path:** loading, empty, error, denied, offline.
- **Boundaries:** features import only another feature's `index.js`; packages
  never import apps; apps never import each other; shared packages stay DOM-free.
- **No fake integrations.** Mocks are labeled; never presented as production.
- **File ≤ 250 lines, component ≤ 180 lines.**

---

## 10. Stack

React 19 · Vite 8 · TanStack Query 5 · XState 5 · Zod · i18next 17 · MSW 3 ·
Vitest 5 · Playwright · Tailwind 3.4 · pnpm 11 · Turborepo 2 · Next.js 16
(marketing) · lucide-react.
