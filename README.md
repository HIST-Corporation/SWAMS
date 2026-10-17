# SWAMS — Smart Workflow & Attendance Management System

SWAMS is a workflow & attendance management platform built for Nepal's SMEs:
BS/AD dates, Nepali + English, light and dark themes.

This repo currently holds the **Frontend monorepo** (`Frontend/` — pnpm + Turborepo):
a staff/manager/HR web app, a public marketing landing, and an admin console.

---

## 1. Repository layout

```
SWAMS/
├── README.md            <- this file (repo overview + index)
├── .gitignore           <- root ignores (node_modules, .DS_Store, .env*, builds, logs)
└── Frontend/            <- the frontend monorepo (everything below lives here)
    ├── apps/
    │   ├── web/         Vite + React 19 PWA — staff/manager/HR app (+ /landing)
    │   ├── console/     Vite admin app — platform administration
    │   ├── marketing/   Next.js static export — public site (en + ne)
    │   └── mobile/      placeholder (no src yet)
    ├── packages/        shared, DOM-free libraries (see section 4)
    ├── docs/            product, design, api-contract, frontend, ops, adr docs
    ├── scripts/         generators + repo guards (gen-feature, gen-component, …)
    ├── tests/           shared Vitest setup
    ├── design-prototype/ HTML landing prototype (source of the /landing port)
    ├── package.json     workspace scripts (turbo, vitest, eslint, prettier…)
    ├── pnpm-workspace.yaml
    └── turbo.json
```

Full master documentation lives in
[`Frontend/README.md`](Frontend/README.md) — architecture, design system,
information architecture, feature inventory, and changelog.

---

## 2. Quick start

```bash
cd Frontend
pnpm install          # one time — installs all workspace projects
pnpm dev              # turbo run dev — starts every app below
```

| App | Local URL | Command |
| --- | --- | --- |
| Web app (staff/manager/HR, Vite + React 19 PWA) | **http://localhost:5173** | `pnpm --filter @swams/web dev` |
| Admin console (platform admin) | **http://localhost:3001** | `pnpm --filter @swams/console dev` |
| Marketing site (Next.js static export) | **http://localhost:3000** | `pnpm --filter @swams/marketing dev` |

- Web app runs at `:5173`; console at `:3001` (separate auth realm); marketing at `:3000`.
- Local dev uses `.env.local` (copy of `.env.example`) — an empty `VITE_API_URL`
  turns on the MSW mock server (mock-first). `.env` / `.env.*` are gitignored.
- Run apps individually with `pnpm --filter @swams/<pkg> dev`.

### First visit vs. returning visit

The app root `/` is a **gate**, not the dashboard:

- **First visit (no session)** → `RootRedirect` sends the visitor to the public
  **`/landing`** marketing page.
- **After sign-up / sign-in** → the session machine authenticates and the user
  lands directly on **`/dashboard`**.

### Demo credentials

**Mock sign-in is on by default** — there is no backend. Any valid email + a
password of 8+ characters works. The login screen autofills the demo account
for the selected role; press **Sign in**.

| Role card | Email | Password | Application |
| --- | --- | --- | --- |
| Executive (CEO) | `aarav@swams.com` | `password` | apps/web |
| HR / Manager (HR) | `sarah@swams.com` | `password` | apps/web |
| Dept. Manager | `ramesh@swams.com` | `password` | apps/web |
| Team Lead | `anita@swams.com` | `password` | apps/web |
| Staff (Frontend) | `priya@swams.com` | `password` | apps/web |
| Staff · Backend | `james@swams.com` | `password` | apps/web |
| Staff · QA | `tina@swams.com` | `password` | apps/web |
| Staff · DevOps | `raj@swams.com` | `password` | apps/web |
| Platform admin (super admin) | `admin@swams.com` | `password` | **apps/console only** |

**MFA demo** (triggers the 6-digit step): `mfa@himaldigital.com.np` / any 8+
characters / any 6 digits.

The demo org is **Himal Digital Pvt. Ltd.** (timezone `Asia/Kathmandu`, fiscal
year starts 07-16). Credentials live in
`Frontend/apps/web/src/features/auth/mocks/handlers.js`; demo people in
`Frontend/apps/web/src/mocks/roster.js`.

Six core roles live in `packages/permissions` (`staff`, `team_lead`,
`manager`, `hr`, `owner` = executive, `super_admin` = platform). See
[`Frontend/docs/frontend/role-permission-matrix.md`](Frontend/docs/frontend/role-permission-matrix.md).

---

## 3. Commands (run inside `Frontend/`)

| Command | What it does |
| --- | --- |
| `pnpm dev` | Turborepo: start all apps |
| `pnpm build` | Turborepo build of every app/package |
| `pnpm test` | Vitest across all packages/apps (unit + component) |
| `pnpm lint` | ESLint + JS-only guard + import-boundary guard |
| `pnpm format` / `pnpm format:check` | Prettier write / check |
| `pnpm e2e` | Playwright smoke + contrast audit (`apps/web/e2e`) |
| `pnpm gen:feature <n>` | Scaffold a feature folder |
| `pnpm gen:component <C>` | Scaffold a UI component + story + test |
| `pnpm storybook` | Storybook for `@swams/ui` |

---

## 4. Packages (`Frontend/packages/`) — shared, DOM-free

| Package | What it holds |
| --- | --- |
| `@swams/design-tokens` | Single source of visual truth: `tokens.json` → CSS + Tailwind preset + RN theme |
| `@swams/ui` | Component library: primitives (Button, Input, Badge, Avatar…), patterns (Card, StatTile, CommandPalette…), ThemeProvider/ThemeToggle, Toast, Storybook |
| `@swams/i18n` | English + Nepali catalogs, i18next factory, formatters (BS/AD, NPR lakh grouping) |
| `@swams/domain` | Pure logic: worked minutes, overtime, BS/AD date parts, leave math |
| `@swams/validation` | Zod schemas shared by forms |
| `@swams/permissions` | Permission keys + per-role bundles + `can()` (UX only — server is the real gate) |
| `@swams/api-client` | The one fetch layer (`apiClient`): axios, request IDs, single-flight refresh, one `AppError` shape |
| `@swams/config` | Shared ESLint/tooling configs |

**Boundaries** (enforced by `pnpm lint` → `scripts/check-boundaries.mjs`):
features import only another feature's `index.js`; packages never import apps;
apps never import each other; shared packages stay DOM-free.

---

## 5. Apps in detail

### `apps/web` — staff/manager/HR (Vite + React 19 PWA)

Routing, auth gate, landing. Route tree
(`apps/web/src/routes/index.jsx`):

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

State ownership: **server data** → TanStack Query (one key factory per
feature, `hooks/keys.js`); **auth/session** → XState session machine +
`useAuth()`, guarded by `RequireAuth`/`RequirePermission`; **UI state** →
React Router URL + zustand stores (`stores/ui.js`, `stores/presence.js`).

### `apps/console` — platform admin (separate Vite app)

Own mock auth realm (`session.js`, `admin@swams.com` / `password`), sign-in
gate, sidebar sections (Overview, Organizations, Admin accounts, System
health), en/ne (`console` namespace), both themes, honest fixture banner.

### `apps/marketing` — public site (Next.js static export, en + ne)

### `apps/mobile` — placeholder (no `src` yet)
---

## 6. Feature inventory (`Frontend/apps/web/src/features/`)

- **auth** — session machine, login/MFA/forgot, role + persona pickers, brand
  panel, "remember me".
- **marketing** — the public `/landing` page ported from
  `design-prototype/SWAMS_Landing.html` (Header, Hero + ProductPreview,
  Modules, CodeShowcase, Workflow, Roles, Pricing, DemoCta, Footer,
  LanguageSwitch, `useReveal`).
- **dashboard** — role-aware Home (`dashboardView(principal)`), session band,
  KPI row, org/staff boards, presence + status picker, charts, benchmark,
  insights, needs-you.
- **attendance** — punch card + shift strip, timer ring, week strip, month
  calendar (`GET /attendance/calendar`), history, team board, corrections
  (request + reviewer queue).
- **video** — call room: stage, filmstrip, three-zone control bar (devices,
  record, centered Leave), invite panel (`POST /notifications`), AI assistant
  rail tab, real device toggles.
- **messages** — roster staff list with availability dots, per-person threads,
  local composer.
- **analytics / reports** — org summaries + `/analytics` week/month/year
  progress view (`GET /reports/analytics`, Recharts).
- **leave · tasks · calendar · meetings · team · meetup · notifications ·
  settings · audit · onboarding**.

### Mock-first data layer

No backend. MSW serves the OpenAPI-shaped contract in each feature's
---

## 7. Design system (summary)

- **Tokens, not literals.** No raw colors/px in feature code — every value is
  a CSS variable / Tailwind token (`packages/design-tokens/css/tokens.css`).
- **i18n everywhere.** `en` + `ne`; per-feature namespaces
  (`common`, `nav`, `attendance`, `dashboard`, `messages`, `meetings`,
  `team`, `video`, `leave`, `marketing`, `notifications`, `settings`,
  `audit`, `reports`, `tasks`, `calendar`); catalog parity test enforced.
- **Both themes, three widths** (360 / 768 / 1280).
- **States before happy path:** loading (skeleton), empty, error (request id
  + retry), denied, offline.
- **Motion** answers an action and respects `prefers-reduced-motion`.
- **Color never carries meaning alone** — a word or icon always accompanies it.
- **Icons:** `lucide-react` throughout, decorative (`aria-hidden`).
- **Type:** `Syne` display, `DM Sans` body, `DM Mono` numerics.
- Full spec: [`Frontend/README.md` section 4](Frontend/README.md) +
  [`Frontend/docs/frontend/design-system.md`](Frontend/docs/frontend/design-system.md).

---

## 8. Testing

- **Unit/component:** Vitest (`pnpm test`) — component tests opt into jsdom
  via `// @vitest-environment jsdom`; `tests/setup.js` adds jest-dom
  matchers. Catalog parity and every feature handler contract covered.
- **E2E:** Playwright (`pnpm e2e`) — sign-in smoke, theme persistence,
  dashboard parity, calendar, and a WCAG contrast/visibility audit across
  product pages in both themes and widths.
- **Guards:** `pnpm lint` (ESLint + JS-only + boundaries) must be clean.

---

## 9. Docs index (`Frontend/docs/`)

| Path | Contents |
| --- | --- |
| `product/` | Product specs |
| `design/` | Design docs |
| `frontend/` | `design-system.md`, `role-permission-matrix.md`, `audit-report.md` |
| `api-contract/` | OpenAPI contract + `contract-requests.md` (endpoint change log) |
| `ops/` | Operations docs |
| `adr/` | Architecture decision records |
| `FRONTEND_PROMPT.md` | Binding build contract |
| `GAP_ANALYSIS.md`, `PROGRESS.md` | Status tracking |
| `WORK_LOG_RECORDING_2026-10-08.md` | Build work log |

---

## 10. Non-negotiables (short form)

- **JavaScript only.** No `.ts` files.
- **Tokens, not literals.** No raw colors / px / user-visible strings in
  feature code.
- **i18n everywhere.** English + Nepali; BS/AD dates via `packages/i18n`.
- **Both themes, three widths** (360 / 768 / 1280).
- **States before happy path:** loading, empty, error, denied, offline.
- **Boundaries:** features import only another feature's `index.js`; packages
  never import apps; apps never import each other; shared packages stay
  DOM-free.
- **No fake integrations.** Mocks are labeled; never presented as production.
- **File ≤ 250 lines, component ≤ 180 lines.**

---

## 11. Stack

React 19 · Vite 8 · TanStack Query 5 · XState 5 · Zod · i18next 17 · MSW 3 ·
Vitest 5 · Playwright · Tailwind 3.4 · pnpm 11 · Turborepo 2 · Next.js 16
(marketing) · lucide-react.

`mocks/`. New/changed endpoints are recorded in
`Frontend/docs/api-contract/contract-requests.md` and asserted by
`handlers.test.js`. Every mock is labeled as a fixture — the UI says so out
loud (`PreviewNotice`) rather than posing as live data.


