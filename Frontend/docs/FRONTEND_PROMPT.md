# SWAMS Frontend Master Prompt (v1)

### Smart Workflow and Attendance Management System: web app, marketing site, console UI, mobile-ready

**Scope:** frontend only. The backend is specified elsewhere (`SWAMS_Master_Prompt_Unified.md`); here it is a **contract** (OpenAPI) that the frontend consumes, and a mock server stands in until it exists.
**Date:** 2026-10-08 · **Language:** JavaScript only (no TypeScript) · **Themes:** light and dark, user-switchable · **Market:** Nepal SMEs first

---

## 0. HOW TO USE

1. Save as `docs/FRONTEND_PROMPT.md` and add to `CLAUDE.md`: `Read docs/FRONTEND_PROMPT.md before any frontend task.`
2. Or paste whole into a new agent session. Start with **Section 20 (First Task)**; never ask for "the whole app".
3. Legend: ✅ exists in the prototype (port it) · 🆕 new in this document · ⚠️ `OPEN_DECISION` (propose options, wait for owner, record an ADR).

## 1. ROLE & BEHAVIOR

You are a small senior product-engineering team: Design Lead, Frontend Architect, Accessibility Engineer, Content Designer, QA Automation. You build a product people open every day on a mid-range Android phone and an office desktop.

- Inspect first; reuse before writing. Build vertical slices (screen + states + tests + docs).
- Design like a person with taste, not a template: Section 9 is binding, not decorative.
- Never claim "done" without running lint, tests, build and looking at the result in **both themes** and at **three widths** (360, 768, 1280).
- Separate FACT / ASSUMPTION / OPINION in analyses. Never invent APIs; if the contract lacks something, raise a contract request.
- Never fake an integration (video, payments, maps, AI) as production behavior; label mocks.

## 2. DESIGN READ AND DIALS (decided up front so the agent does not drift)

**Reading this as:** a daily-use B2B workforce product for Nepali SME staff, managers and HR, with a warm, confident, uncluttered language, practical rather than flashy. Dashboard-class product UI, so density matters more than on a landing page.

| Dial (1–10)     | App (`apps/web`) | Marketing (`apps/marketing`) | Why                                                                     |
| --------------- | ---------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Design variance | 4                | 7                            | App favors familiarity and scanning; marketing may be more expressive   |
| Motion          | 3                | 5                            | App motion answers actions only; marketing gets one orchestrated moment |
| Density         | 6                | 3                            | HR/manager screens carry tables and queues                              |

Layout energy reference (from owner direction): bold hero stat cards, soft tinted panels, colored icon chips, clean rounded surfaces. Replicate the _structure and feel_ of that layout style, not just recolor an old one. **No lime/acid-green accent.** Brand color is still open (⚠️); Section 8.2 proposes a palette to be confirmed.

---

## 3. COMPETITIVE ANALYSIS (researched Oct 2026; vendor-reported data; re-verify before using in marketing)

| Product                                                      | Segment                  | Strengths to learn from                                                                                                          | Weaknesses / gap for SWAMS                                                              |
| ------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Deputy**                                                   | Global shift workforce   | Schedule linked to live attendance and timesheets; leave and availability; reported ~USD 5.50 (Lite) / ~10 (Pro) per employee/mo | USD pricing; no Nepal rules; scheduling-first, not work-first                           |
| **Connecteam**                                               | Deskless/SMB             | Tasks, forms, chat, training and time clock in one app; free tier lowers adoption friction                                       | Shallow HR depth; no Nepal context                                                      |
| **Homebase**                                                 | US hourly SMB            | Free entry tier, strong mobile, payroll integrations                                                                             | US/restaurant-retail orientation                                                        |
| **OnTheClock**                                               | Field crews              | Layered punch controls: GPS + geofence + IP + Wi-Fi + device                                                                     | Narrow product                                                                          |
| **Zoho People / Keka / greytHR**                             | India SME and mid-market | Selfie + geofence + face-recognition punch; workflow builder; self-service; payroll compliance depth                             | India-statutory focus; Keka mobile sync issues reported; Zoho payroll billed separately |
| **Truein / Pocket HRMS**                                     | India attendance         | Face + GPS punch to stop buddy punching                                                                                          | Attendance only                                                                         |
| **RigoHR, RealHRsoft** (RealHRsoft: 200+ companies reported) | Nepal HRIS               | BS calendar, SSF/PF/TDS, biometric device integration                                                                            | HR-suite-first, heavier UX, no work/task layer                                          |
| **NepalHRM**                                                 | Nepal startups/SMEs      | PF, CIT, SSF, eTDS preconfigured; bilingual payslips; reported free for startups                                                 | HR/payroll-first, new                                                                   |
| **Leave Balance**                                            | Nepal leave/payroll      | Flat-rate price, BS dual dates, Slack/Teams/Google Chat                                                                          | Leave and payroll only                                                                  |

**Nepal table-stakes the UI must show on day one:** BS/AD dual dates, Nepali fiscal year, public-holiday calendar, Nepali and English UI, NPR with lakh/crore grouping.

**What we learn for the UI specifically**

| Pattern seen                                    | Our decision                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "Who's in right now" board (Deputy, Connecteam) | Team live board on Manager/HR home; present, on break, late, on leave, not yet in                         |
| Exception-first dashboards                      | Home leads with what needs action (approvals, missed punches, late), not vanity totals                    |
| Selfie + geofence punch (Keka, Zoho)            | Punch UI supports layered checks; failed check becomes a clear "needs review" state, never a silent block |
| Approvals inside the notification (Slack-style) | One-tap approve/reject from notification, with an undo window                                             |
| Mobile apps with sync bugs (Keka reviews)       | Explicit sync state on every queued action; never leave the user guessing                                 |
| Nepali tools with dated UI                      | Modern but calm visual language, real Nepali content, fast on weak networks                               |
| Surveillance tracking (screenshots/keystrokes)  | Not built. Location only at punch, with a plain-language consent screen                                   |

---

## 4. PERSONAS & ACCESS MODEL (frontend view)

| Persona                                                     | Device (typical)      | Goal                                     | Home lens                                                  |
| ----------------------------------------------------------- | --------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| **Staff** (Frontend/Backend/QA/DevOps views from prototype) | Android phone, laptop | Punch in, see my day, request leave      | My day: clock card, tasks due, next meeting, leave balance |
| **Manager**                                                 | Phone + laptop        | Know who is in, unblock work, approve    | Team board, approvals queue, team workload                 |
| **HR**                                                      | Desktop               | Exceptions, approvals, policies, reports | Org presence, exceptions, leave heatmap, headcount         |
| **Org Owner/Admin**                                         | Desktop               | Configure org, roles, billing            | Setup checklist, settings, billing                         |
| **Platform Super Admin** (`apps/console`)                   | Desktop               | Tenants, plans, support                  | Separate app and login realm                               |
| **Kiosk** (later)                                           | Shared tablet         | Quick punch                              | Locked single-purpose screen                               |

### 4.1 Frontend authorization (UX only; the server is the real gate)

`can(permission, resource?)` from `packages/permissions`. Three layers, all driven by one **navigation config** so nothing is hard-coded in components:

```js
// apps/web/src/app/nav.config.js (shape)
{ id:'leave', labelKey:'nav.leave', icon:'CalendarOff', path:'/leave',
  requires:{ permission:'leave.read', entitlement:'leave' },
  mobile:{ tab:true, order:4 }, children:[ ... ] }
```

- **Route guard:** auth → org loaded → permission → entitlement; denied renders a designed "no access" page that says who can grant it, not a blank.
- **UI guard:** `<Can permission="leave.approve">` hides or disables (disabled shows why in a tooltip/hint).
- **Scope lens:** dashboards request `?scope=self|team|org` by role; the UI never assumes a scope from the role label.
- **Entitlement:** locked features show an upgrade card with what they do, not a dead link.
- Permission keys: `attendance.read|write|approve|correct`, `leave.read|create|approve|configure`, `tasks.read|write|manage`, `projects.manage`, `team.read|manage`, `users.manage`, `roles.manage`, `reports.read`, `analytics.read`, `settings.manage`, `billing.manage`, `audit.read`, `ai.use`, `meetings.manage`, `messages.moderate`.

---

## 5. SYSTEM ARCHITECTURE (frontend)

```text
Browser / PWA / (later) Expo app
 ├─ app shell: providers · router · theme · i18n · auth session · error boundaries
 ├─ features/*  (UI + hooks + local state per domain)
 ├─ packages/ui  (components) · packages/design-tokens · packages/i18n
 ├─ packages/domain (pure rules: time math, BS calendar, leave/overtime preview)
 ├─ packages/api-client  ──HTTPS /api/v1──►  API   (dev: MSW mock server from the OpenAPI contract)
 └─ realtime (Socket.IO) · service worker (cache + offline queue)
```

**State ownership (never mix):**

| Kind                 | Owner                               | Example                                  |
| -------------------- | ----------------------------------- | ---------------------------------------- |
| Server data          | TanStack Query                      | sessions, leave requests, tasks          |
| Workflow/UI process  | state machines (XState or reducers) | punch flow, offline queue, wizard        |
| Ephemeral UI         | `useState`                          | open menu, hover                         |
| Cross-screen UI      | Zustand                             | sidebar collapsed, active filters, theme |
| Persisted preference | localStorage + profile API          | theme, language, calendar (BS/AD)        |
| URL                  | router                              | filters, tab, selected id (shareable)    |

**Rules:** business rules live in `packages/domain`, not in components; components never call `fetch` directly (hooks → api-client); sockets are hints that patch/invalidate the Query cache, REST is truth; every async UI has loading, empty, error, denied, offline states.

**Auth flow (web):** access token in memory; refresh via httpOnly cookie; one in-flight refresh shared by queued requests; on refresh failure show a calm "session ended" screen preserving the unsaved form draft. Mobile build swaps the token store (secure storage) behind the same interface.

**Mock-first development:** generate MSW handlers and fixtures from the OpenAPI contract so every screen is buildable and testable before the backend exists. Fixtures use realistic Nepali data (Section 8.8). A `?mock=1` switch and CI use the same handlers.

**Build and delivery:** Vite, route-level code splitting, hashed assets on a CDN, env via `import.meta.env` (public values only, validated at boot), Sentry for errors, Lighthouse CI budgets, Playwright smoke on preview deployments.

---

## 5A. FRONTEND TECHNOLOGY STACK (tools and programs; source = your PDF, Volume 01, or added by this prompt)

Version policy: at project start, install the **latest stable major** of each tool, verify compatibility between them (React 19 with the UI libraries, Vite with the PWA plugin, Tailwind with the shadcn setup), commit the lockfile, and record the chosen versions in `docs/frontend/stack.md`. Renovate or Dependabot opens update PRs. Do not invent versions from memory.

| Area                 | Tool                                                                                                                                            | Role                                             | Source                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Language             | **JavaScript (ES2023+)** with JSDoc and `// @ts-check` in shared packages                                                                       | All code                                         | **Changed:** your PDF says TypeScript; your later docs choose JavaScript. No `.ts` files                                 |
| UI library           | **React 19**                                                                                                                                    | Components                                       | PDF + Vol 01                                                                                                             |
| App build            | **Vite**                                                                                                                                        | Dev server, bundling for `apps/web`              | Vol 01                                                                                                                   |
| Routing              | **React Router** (data router, lazy routes)                                                                                                     | `apps/web` navigation                            | Vol 01                                                                                                                   |
| Public site          | **Next.js** (static export, SSG) + **MDX** + `next-intl`                                                                                        | `apps/marketing` only (SEO, en/ne)               | PDF (Next.js), scoped to marketing                                                                                       |
| Styling              | **Tailwind CSS**                                                                                                                                | Utility styling via the tokens preset            | PDF + Vol 01                                                                                                             |
| Components           | **shadcn/ui** (copied as `.jsx`, restyled) on **Radix UI** primitives, plus `class-variance-authority`, `clsx`, `tailwind-merge`                | Accessible primitives                            | PDF                                                                                                                      |
| Icons                | **lucide-react**                                                                                                                                | Only icon set                                    | PDF                                                                                                                      |
| Motion               | **Framer Motion** (package `motion`), used sparingly, respects reduced motion                                                                   | Punch confirmation, sheets, drag feedback        | Vol 01                                                                                                                   |
| Server state         | **TanStack Query** (React Query)                                                                                                                | Fetching, cache, optimistic updates              | PDF + Vol 01                                                                                                             |
| Client state         | **Zustand**                                                                                                                                     | Small cross-screen UI state                      | PDF + Vol 01                                                                                                             |
| Workflow state       | **XState v5**                                                                                                                                   | Section 7 machines                               | Added                                                                                                                    |
| HTTP                 | **Axios** (in `packages/api-client`, with refresh-token interceptor and request IDs)                                                            | API calls, works on web and React Native         | Vol 01                                                                                                                   |
| Forms                | **React Hook Form** + **Zod** + `@hookform/resolvers`                                                                                           | Forms and validation                             | PDF + Vol 01                                                                                                             |
| Realtime             | **Socket.IO client**                                                                                                                            | Notifications, presence, live updates            | PDF + Vol 01                                                                                                             |
| Tables and lists     | **TanStack Table** + **TanStack Virtual**                                                                                                       | Data tables, long lists                          | Added                                                                                                                    |
| Drag and drop        | **dnd-kit**                                                                                                                                     | Kanban with keyboard support                     | Added                                                                                                                    |
| Charts               | **Recharts** (lazy-loaded)                                                                                                                      | Dashboards, analytics                            | Added                                                                                                                    |
| Maps                 | **MapLibre GL** or Leaflet (⚠️ tile provider open)                                                                                              | Geofence editor                                  | Added                                                                                                                    |
| Dates                | **date-fns** + BS/AD lookup in `packages/domain` (evaluate maintained open-source BS converters, verify their data)                             | Formatting, calendars                            | Added                                                                                                                    |
| i18n                 | **i18next** + `react-i18next` with ICU message format                                                                                           | English and Nepali                               | Added                                                                                                                    |
| PWA                  | **vite-plugin-pwa** (Workbox)                                                                                                                   | Install, offline shell, background sync          | Added                                                                                                                    |
| Sanitizing           | **DOMPurify**                                                                                                                                   | Any rich text                                    | Added                                                                                                                    |
| Unit/component tests | **Vitest** + **Testing Library**                                                                                                                | Logic and components                             | **Changed:** your PDF lists Jest; Vitest has a near-identical API and runs natively on Vite. Use Jest only if you prefer |
| API mocking          | **MSW**                                                                                                                                         | Mock server, tests                               | Added                                                                                                                    |
| E2E                  | **Playwright**                                                                                                                                  | Browser flows, visual snapshots                  | PDF                                                                                                                      |
| Accessibility tests  | **axe-core** (`@axe-core/playwright`)                                                                                                           | CI checks                                        | Added                                                                                                                    |
| Component workshop   | **Storybook**                                                                                                                                   | One story per state, both themes                 | Added                                                                                                                    |
| Performance          | **Lighthouse CI**, `web-vitals`                                                                                                                 | Budgets                                          | Added                                                                                                                    |
| Error tracking       | **Sentry** (browser SDK)                                                                                                                        | Errors, releases, source maps                    | PDF                                                                                                                      |
| Code quality         | **ESLint** (flat config, a11y + hooks + boundaries), **Prettier**, **Husky**, **lint-staged**, **Commitlint**, **dependency-cruiser**, **knip** | Enforced structure                               | Added                                                                                                                    |
| Monorepo             | **pnpm workspaces** + **Turborepo**                                                                                                             | Packages and caching                             | Added                                                                                                                    |
| Local dev            | **Docker + Docker Compose** (API, DB when needed; frontend runs natively)                                                                       | Parity with backend                              | PDF                                                                                                                      |
| CI/CD                | **GitHub Actions**                                                                                                                              | Lint, test, build, deploy                        | PDF                                                                                                                      |
| Hosting (static)     | **Vercel** (from your PDF) or Cloudflare Pages / Netlify ⚠️                                                                                     | SPA and marketing on a CDN                       | PDF, alternatives added                                                                                                  |
| Fonts                | **Fontsource** (self-hosted, subset)                                                                                                            | Latin + Devanagari, no third-party font requests | Added                                                                                                                    |
| Design handoff       | **Figma** (source of design), Storybook (source of truth for built components)                                                                  | Design workflow                                  | Added                                                                                                                    |
| Mobile later         | **Expo** (React Native, JavaScript), React Navigation, secure storage, push                                                                     | Reuses `packages/*`                              | Added                                                                                                                    |

**Deliberately not used:** TypeScript, Redux, styled-components, Material UI, Bootstrap, jQuery, Font Awesome (prototype only), moment.js, tokens in localStorage, any CSS-in-JS runtime.
**Every new dependency** needs a one-line reason in the PR, bundle-size impact, license check, and a maintenance check (recent releases, open security advisories). Third-party scripts need an ADR.

---

## 6. FOLDER STRUCTURE (generate exactly; stays organized because it is enforced)

Tooling: pnpm workspaces + Turborepo, ESLint flat config + Prettier, Husky + lint-staged, Commitlint, `dependency-cruiser` (import boundaries), `knip` (dead code), Storybook, Vitest, Playwright.

```text
swams-frontend/
├── apps/
│   ├── web/                          # Vite + React 19 PWA (staff, manager, HR/admin areas)
│   │   ├── index.html                # contains the pre-paint theme script (Section 8.3)
│   │   ├── public/                   # manifest.webmanifest, icons/, offline.html, locales are NOT here
│   │   ├── src/
│   │   │   ├── main.jsx
│   │   │   ├── app/                  # App.jsx, providers/, router.jsx, nav.config.js, error-boundary/
│   │   │   ├── routes/               # route tree only: lazy imports of feature pages + guards
│   │   │   ├── features/             # ALL product code, one folder per domain (Section 6.1)
│   │   │   │   ├── auth/ onboarding/ dashboard/ attendance/ leave/ requests/
│   │   │   │   ├── tasks/ projects/ team/ calendar/ meetings/ video/ meetups/
│   │   │   │   ├── messages/ notifications/ reports/ analytics/ ai/ settings/ billing/ audit/
│   │   │   ├── shell/                # AppShell, Sidebar, Topbar, BottomNav, CommandPalette, ThemeToggle, LanguageSwitch
│   │   │   ├── lib/                  # queryClient, apiClient instance, socket, pwa, sentry, analytics
│   │   │   ├── hooks/                # cross-feature hooks only (useMedia, useOnline, useDisclosure)
│   │   │   ├── stores/               # Zustand slices for UI state only
│   │   │   ├── machines/             # shared state machines (offline queue, session)
│   │   │   ├── mocks/                # MSW handlers, fixtures (Nepali data), scenarios
│   │   │   └── styles/               # globals.css, fonts.css (tokens come from the package)
│   │   ├── e2e/                      # Playwright specs for this app
│   │   └── README.md
│   ├── marketing/                    # Next.js static export; en + ne
│   │   ├── app/ (page routes: /, /features, /pricing, /nepal, /security, /contact, /demo, /legal/*)
│   │   ├── components/  content/ (MDX, per language)  public/
│   ├── console/                      # Platform admin UI (separate deploy and auth realm)
│   └── mobile/                       # RESERVED for Expo (README + ADR only until approved)
├── packages/
│   ├── design-tokens/                # tokens.json (source) → css/tokens.css, tailwind-preset.js, rn-theme.js
│   ├── ui/                           # component library
│   │   ├── src/primitives/           # Button, Input, Select, Checkbox, Switch, Dialog, Sheet, Tooltip, Tabs, Menu...
│   │   ├── src/patterns/             # DataTable, FilterBar, FormField, EmptyState, ErrorState, Skeletons, StatTile, Avatar, Chip, DateCell
│   │   ├── src/domain-ui/            # PunchCard, LeaveBalanceRing, KanbanBoard, TaskCard, CalendarGrid, PollOption, PresenceBadge
│   │   └── stories/                  # Storybook, one story per state (loading, empty, error, dark, ne)
│   ├── i18n/                         # locales/en/*.json, locales/ne/*.json (per feature namespace), formatters (BS/AD, NPR, lakh grouping)
│   ├── domain/                       # pure JS: attendance time math, overtime preview, leave rules preview, BS calendar, validators
│   ├── validation/                   # zod schemas (shared with backend)
│   ├── permissions/                  # keys, default bundles, can()
│   ├── api-client/                   # request layer derived from OpenAPI; platform-agnostic
│   └── config/                       # eslint, prettier, tailwind, vite, vitest shared
├── docs/                             # Section 17
├── tests/ (visual/ axe/ perf/)  ├── design-prototype/ (read-only copy of the two HTML files)
├── .github/ (workflows, PR template, CODEOWNERS) · .env.example · turbo.json · pnpm-workspace.yaml · CLAUDE.md
```

### 6.1 Feature folder template (identical everywhere)

```text
features/attendance/
  index.js            # PUBLIC API; the only file other features may import
  routes.jsx          # route objects for this feature
  pages/              # TodayPage.jsx, HistoryPage.jsx, TeamPage.jsx, CorrectionsPage.jsx (thin: compose only)
  components/         # feature-only UI (TimerRing, PunchHistoryRow, GeofenceBadge)
  hooks/              # usePunch.js, useSessions.js (Query wrappers), keys.js (query-key factory)
  machines/           # punch.machine.js (+ test)
  api.js              # calls through packages/api-client
  schemas.js          # re-exports/extends packages/validation
  mocks/              # feature MSW handlers + fixtures
  __tests__/  README.md   # purpose, screens, permissions, states, open decisions
```

### 6.2 Anti-mess rules (enforced in CI)

1. Features import only another feature's `index.js`; `packages/*` never import from `apps/*`; apps never import each other.
2. Limits: file ≤ 250 lines, component ≤ 180, function ≤ 40 (warn), 2× fails CI.
3. Names: folders `kebab-case`; components `PascalCase.jsx`; hooks `useThing.js`; machines `thing.machine.js`; tests `thing.test.jsx`.
4. No `utils/` dumping: a helper lives next to its feature; promoted to a package only when two apps need it.
5. Generators: `pnpm gen:feature <name>`, `pnpm gen:component <name>`; agents must use them.
6. No raw colors, px sizes, or user-visible strings in feature code (lint rules); everything goes through tokens and i18n keys.
7. Every feature has a README and every component has a story for each state.

---

## 7. CORE WORKFLOWS AS EXPLICIT STATE MACHINES (UI side)

Use **XState v5** for the machines below (small, testable, visualizable); plain reducers are fine for trivial ones. Each machine lives in its feature's `machines/`, has a unit test that walks every transition, and drives the UI (components render from `state.matches(...)`, never from scattered booleans). Server rules stay on the server; machines model what the _user sees and can do_.

### 7.1 Punch (clock in/out) ✅ hero interaction

| State                                                                                                                                                                                                                                          | UI                                                                                                     | Events → next                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `idle`                                                                                                                                                                                                                                         | Large "Clock in" button, today's shift, geofence hint                                                  | `PUNCH_IN` → `checking`                                                                       |
| `checking`                                                                                                                                                                                                                                     | Button shows progress; steps checked as they pass: location, area, device (selfie only if policy asks) | `PASS` → `submitting`; `FAIL(reason)` → `needsReview`; `PERMISSION_DENIED` → `permissionHelp` |
| `permissionHelp`                                                                                                                                                                                                                               | Plain steps to enable location for this site/app; "Try again"                                          | `RETRY` → `checking`; `PUNCH_ANYWAY` (if policy allows) → `submitting` flagged                |
| `submitting`                                                                                                                                                                                                                                   | Optimistic: timer starts immediately                                                                   | `OK` → `working`; `NETWORK_ERROR` → `queued`; `REJECTED` → `error`                            |
| `queued`                                                                                                                                                                                                                                       | "Saved on this device, sending when online" badge + count                                              | `ONLINE` → `syncing`                                                                          |
| `syncing`                                                                                                                                                                                                                                      | Subtle spinner on the badge                                                                            | `SYNCED` → `working`; `CONFLICT` → `needsReview`                                              |
| `working`                                                                                                                                                                                                                                      | Live timer, "Take a break", "Clock out"                                                                | `BREAK` → `onBreak`; `PUNCH_OUT` → `confirmOut`                                               |
| `onBreak`                                                                                                                                                                                                                                      | Break timer, "Back to work"                                                                            | `RESUME` → `working`                                                                          |
| `confirmOut`                                                                                                                                                                                                                                   | Summary (hours today, overtime preview) + "Clock out" / "Not yet"                                      | `CONFIRM` → `submitting(out)`; `CANCEL` → `working`                                           |
| `needsReview`                                                                                                                                                                                                                                  | Neutral explanation of what was flagged; punch is saved, a manager will review                         | `ACK` → `working`/`idle`                                                                      |
| `error`                                                                                                                                                                                                                                        | What happened and what to do, request ID collapsed under "Details"                                     | `RETRY`, `DISMISS`                                                                            |
| Guards: server time is shown as truth once received; client clock drift beyond a limit shows a notice. Confirmation moment (the one signature animation of the app): the ring completes with a short, tactile settle, honoring reduced motion. |

### 7.2 Offline queue and sync (`machines/offline-queue.machine.js`) 🆕

States: `online` ⇄ `offline` → on reconnect `flushing` → `online` | `partialFailure`. Queue items carry `idempotencyKey`, `clientTs`, `kind` (punch, leave draft, task move, comment), `attempts`. Each item has a visible status chip (queued, sending, sent, needs attention). Rules: ordered per entity, dedupe by key, exponential backoff, never drop silently; items needing attention open a one-tap resolve sheet. iOS cannot background-sync reliably, so flush on app foreground and on `online`.

### 7.3 Session and auth

`unknown` → `refreshing` → (`authenticated` | `anonymous`); `authenticated` → `expiring` (soft warning for sensitive screens) → `refreshing`; `refreshing` failure → `sessionEnded` (preserve drafts, return to the same route after login). MFA step: `mfaRequired` → `verifying` → `authenticated`.

### 7.4 Leave request ✅

Form machine: `editing` → `validating` (policy preview: balance after, overlaps, holidays in range, BS/AD shown) → `reviewing` → `submitting` → `pending`. Server outcomes mirrored as read-only status: `pending` → `approved` | `rejected(note)` | `cancelled`. Approver machine: `viewing` → `deciding(approve|reject)` → `undoWindow(5s)` → `committed`. Half-day and hourly are variants of `editing`, not separate screens.

### 7.5 Attendance correction ✅

`draft` → `submitted` → `inReview` → `approved` | `rejected(note)` | `needsInfo` (back to `draft` with the manager's question pinned). UI always shows original punch beside the proposed change.

### 7.6 Task card (kanban) ✅

Lanes: To do, In progress, Review, Revision, Done. Drag machine: `idle` → `dragging` → `hoverLane(valid|invalid)` → `dropping` (optimistic move) → `settled` | `rolledBack(reason)`. Keyboard path: focus card, press Space to lift, arrows to move between lanes, Space to drop, Esc to cancel; announced via live region. Moving to Review needs a reviewer; Revision requires a short note. WIP-limit breach shows a warning, not a hard stop (unless org policy says so).

### 7.7 Team meetup poll ✅ 🆕

`open` (options with votes, "8 of 12 voted") → `voted` (my choices editable until close) → `closed` → `confirming` (organizer picks best date; suggested by most votes, no tie-break magic) → `confirmed` → past meetup record with attendance. Non-voters list visible to the organizer only.

### 7.8 Video call (join and in-call shell) ✅

`lobby` (device check, mic/camera toggles) → `joining` → `inCall` (participants, speaking indicator, chat panel, notes panel, REC indicator only when recording consent was given) → `leaving` → `ended` (summary, notes → tasks later). Provider is an adapter (⚠️ external link in R2, native later); with no provider the UI says so honestly and offers the meeting link.

### 7.9 Theme ✅ (see 8.3) · 7.10 Notification: `unread` → `read` → `acted`; actions are one-tap with undo.

---

## 8. UX / UI DIRECTION

### 8.1 Principles

1. The next action is one tap away; **Clock in** is the hero of staff Home.
2. Exceptions first: show what needs me, then the rest.
3. Mobile first, thumb reachable; desktop gets more context, not different logic.
4. Every screen designs its loading, empty, error, denied and offline states before its happy path.
5. Quiet by default; one memorable moment per screen at most.
6. Respect the user's language, calendar and theme choice everywhere, instantly.

### 8.2 Design tokens (source of truth: `packages/design-tokens/tokens.json`)

Proposed palette ⚠️ brand color open: continuity with the prototype's blue, plus a warm supporting hue (marigold, a familiar Nepali color) so the product does not read as generic blue SaaS. Verify all text pairs ≥ 4.5:1 in **both** themes before accepting.

| Token                                                                                                                                                                                                                                                                         | Light                 | Dark                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------- |
| `--bg`                                                                                                                                                                                                                                                                        | `#F4F5F9`             | `#0E1118`             |
| `--surface`                                                                                                                                                                                                                                                                   | `#FFFFFF`             | `#161A24`             |
| `--surface-raised`                                                                                                                                                                                                                                                            | `#FFFFFF`             | `#1D2230`             |
| `--surface-sunken`                                                                                                                                                                                                                                                            | `#ECEEF5`             | `#0A0D13`             |
| `--border`                                                                                                                                                                                                                                                                    | `#E1E4EE`             | `#2A3042`             |
| `--text`                                                                                                                                                                                                                                                                      | `#14172B`             | `#ECEEF6`             |
| `--text-muted`                                                                                                                                                                                                                                                                | `#4A5068`             | `#A3AAC2`             |
| `--text-faint`                                                                                                                                                                                                                                                                | `#7A8099`             | `#6F7794`             |
| `--primary` (buttons, links)                                                                                                                                                                                                                                                  | `#3F5BE0`             | `#7C93FF`             |
| `--primary-soft` (tinted panels)                                                                                                                                                                                                                                              | `#E8ECFF`             | `#1B2142`             |
| `--on-primary`                                                                                                                                                                                                                                                                | `#FFFFFF`             | `#0E1118`             |
| `--accent` marigold                                                                                                                                                                                                                                                           | `#F2A93B`             | `#F2B552`             |
| `--accent-soft`                                                                                                                                                                                                                                                               | `#FDF1DC`             | `#3A2C12`             |
| `--success` / soft                                                                                                                                                                                                                                                            | `#1F8F5B` / `#DDF3E8` | `#3DD68C` / `#12301F` |
| `--warning` / soft                                                                                                                                                                                                                                                            | `#B86E00` / `#FBEBD0` | `#F5B53D` / `#3A2B0C` |
| `--danger` / soft                                                                                                                                                                                                                                                             | `#D13F58` / `#FBE1E6` | `#FF7A8A` / `#3A1620` |
| `--info` / soft                                                                                                                                                                                                                                                               | `#2879B5` / `#DCEEF9` | `#5CB8F0` / `#122A3B` |
| Icon-chip tints (each has soft bg + strong fg per theme): indigo, marigold, teal, rose, violet. Chart series (color-blind safe, always paired with labels/patterns): indigo `#4F6EF7`, marigold `#F2A93B`, teal `#1FA7A0`, rose `#E0607E`, violet `#8B6CF0`, slate `#7A8099`. |

**Radii by role (not one radius everywhere):** input 8 · button 10 · card 14 · hero card 20 · sheet/dialog 24 · pill/avatar full.
**Spacing:** 4-pt scale (4, 8, 12, 16, 20, 24, 32, 40, 56, 80). **Elevation:** light = soft tinted shadows in two levels; dark = lighter surface + 1px border, no heavy shadows.
**Type:** one family that renders Latin and Devanagari coherently. Proposal ⚠️: **Mukta** (UI and Nepali text), verified by rendering both scripts at 12–48 px; fallbacks `Noto Sans Devanagari`, system-ui. Tabular numerals (`font-variant-numeric: tabular-nums`) for time, money, tables. Scale: 12 / 14 / 16 (base, inputs never below 16 on mobile) / 18 / 22 / 28 / 36 / 48; line-height 1.5 body, 1.2 headings; Devanagari gets +0.1 line-height; max line length 70ch.
**Motion:** 120 ms (feedback), 200 ms (reveal), 320 ms (sheet/page); ease-out `cubic-bezier(.2,.8,.2,1)`; everything off under `prefers-reduced-motion`.
**Z-index:** base 0 · sticky 10 · dropdown 20 · sheet 30 · modal 40 · toast 50.

### 8.3 Light / dark toggle (required, complete in every screen)

- Three options: **Light, Dark, System**. Default System. Control in Topbar (icon button with menu), Login, Marketing header, and Settings > Appearance. Keyboard shortcut `Shift+D` is optional ⚠️.
- Implementation: tokens as CSS variables on `:root` (light) and `:root[data-theme="dark"]`; Tailwind `darkMode: ['class','[data-theme="dark"]']`; `<meta name="color-scheme" content="light dark">`; `color-scheme` set on `:root` so native controls and scrollbars follow.
- **No flash:** a tiny inline script in `index.html` (before CSS) reads the saved choice (or `matchMedia('(prefers-color-scheme: dark)')`) and sets `data-theme` and `<meta name="theme-color">` before first paint.
- Persist: localStorage immediately; also `PATCH /me/preferences` when signed in so mobile and other devices match. Listen to the `storage` event (multi-tab) and to OS changes while on System.
- Theme-aware everything: charts (read tokens, not hardcoded), maps, skeletons, code/notes, avatars, illustrations (single SVG using `currentColor` + token vars, no separate raster per theme), shadows vs borders, focus rings, selection color, image overlays.
- Dark is **designed**, not inverted: lifted surfaces for depth, desaturated status colors (table above), softer white text, verified contrast. Visual regression snapshots in both themes at 360/768/1280.
- Marketing site and console follow the same toggle.

### 8.4 Layout system

Breakpoints: `xs <480 · sm 480–767 · md 768–1023 · lg 1024–1279 · xl ≥1280`. Content max-width 1280 for dashboards, 720 for reading/forms.

- **Mobile:** bottom tab bar (Home, Attendance, Work, Leave, More), top app bar with page title and bell, bottom sheets instead of modals, card rows instead of tables, sticky primary action above the tab bar, safe-area insets, pull-to-refresh, swipe lanes for kanban.
- **Tablet:** rail sidebar (icons) that expands on hover/tap.
- **Desktop:** full sidebar (grouped: Overview, Work, People, Insights, Admin), topbar (search/command palette, org switcher, language, BS/AD, theme, bell, avatar), optional right detail panel for lists.
- Tables degrade to cards below `md`; filters collapse into a sheet.

### 8.5 Navigation (from the prototype, nothing dropped)

Dashboard · Attendance · Work (Task Board, Projects) · Leave & Requests · Team (live board, directory, org chart) · Calendar 🆕 · Meetings · Video Call · Team Meetup · Messages · Reports · Analytics · AI · Notifications · Settings. Items appear by permission, entitlement and release; hidden items never leave empty groups.

### 8.6 Key screens (wireframes: structure, not pixel spec)

**Staff Home (mobile and desktop)**

```text
┌ Good morning, Sita            Bhadra 12, 2083 / Aug 28  [bell]
├ ┌──────────────────────────────┐ ┌───────────┐ ┌───────────┐
│ │ HERO: Punch card (20r)       │ │ Leave left │ │ This week │
│ │ 09:02 in · 4h 18m · Baneshwor│ │ 11 days    │ │ 31h 40m   │
│ │ [ Take a break ] [ Clock out]│ │ (soft tint)│ │ +2h OT    │
│ └──────────────────────────────┘ └───────────┘ └───────────┘
├ Needs you (2)   ▸ Review Rajan's PR  due today   ▸ Sign off timesheet
├ Today's tasks (list, not cards)        ├ Next: Standup 10:30 [Join]
└ Team now: avatars with presence dots (scrolls on mobile)
```

**Manager Home:** left, a "who's in" board grouped by state; right, approvals queue with inline approve/reject; below, workload bars per person; late/missed-punch strip at the top only when non-empty.
**HR Home:** presence donut + exceptions table (late, missed punch, geofence flags) with bulk actions; leave heatmap (BS/AD toggle); headcount by department; reports shortcuts.
Other screens to build at prototype parity then refine: Login, Org setup wizard, Attendance (today, history, team, corrections), Leave (balance, request, approvals, holidays), Task board and list and task drawer, Team (live board, directory, org chart), Calendar, Meetings, Video call, Team meetup, Messages, Reports, Settings (policies, roles matrix, geofence map editor), Billing, Audit log.

### 8.7 Component inventory (each: all states, both themes, `ne` and long-text, keyboard, story)

Primitives: Button (primary, secondary, quiet, danger; sizes; loading), IconButton, Input, Textarea, Select/Combobox, DatePicker (BS/AD toggle), TimePicker, Checkbox, Radio, Switch, Tabs, Tooltip, Popover, Menu, Dialog, Sheet, Toast, Banner, Badge, Avatar (initial on varied tint), Skeleton, Progress, Ring.
Patterns: AppShell, Sidebar, BottomNav, Topbar, CommandPalette, DataTable (sort, filter, bulk, density, responsive-to-cards), FilterBar, FormField, EmptyState, ErrorState, PermissionDenied, OfflineBanner, SyncChip, StatTile, ApprovalRow, NotificationItem, DateCell (BS/AD).
Domain: PunchCard, TimerRing, LeaveBalanceRing, PresenceBadge, KanbanBoard/Lane/TaskCard, TaskDrawer, CalendarGrid (month/week/day, BS/AD), PollOption, MeetingCard, CallStage, Heatmap, OrgChart.

### 8.8 Content and microcopy

Voice: plain, direct, sentence case. Button says what happens ("Send request", "Clock out"); the same word everywhere ("Clock in" not sometimes "Check in"). Errors say what happened and what to do, with no apology and no blame. Empty states invite the first action. Dates read naturally ("Today", "Yesterday", then BS/AD pair). Nepali strings are written by a Nepali-speaking reviewer, not machine-translated; keep an English/Nepali glossary in `docs/design/content-style-guide.md`.
**Sample data (use in mocks, stories, screenshots):** company "Himal Digital Pvt. Ltd."; people Sita Shrestha, Ramesh Adhikari, Anita Thapa, Prakash Gurung, Sunita Rai, Bibek Karki, Aarati Bhandari, Nabin Shrestha, Kiran Lama, Anisha Gurung; sites Baneshwor, Lalitpur, Pokhara; amounts in NPR with lakh/crore grouping (`रू 1,25,000`); holidays Dashain, Tihar, Holi, Buddha Jayanti. No lorem ipsum, no "John Doe", no "Acme". The cast is defined once in `apps/web/src/mocks/roster.js`; every list that shows people (team board, presence, directory, a persona's pod) derives from it so two widgets cannot name the same id differently.

**Sign-in identities follow the owner's prototype, not the sample cast:** the HR demo account is `sarah@swams.com` (Sarah Mitchell) and the Staff role cards are `priya@swams.com` (Frontend), `james@swams.com` (Backend), `tina@swams.com` (QA) and `raj@swams.com` (DevOps), password `password` — the accounts the login screen autofills, one per role. The address alone decides the portal, so a card can never open another role's board. Sarah, Priya, James, Tina and Raj are roster people; the rest of the fixture cast above is unchanged.

### 8.9 Accessibility (WCAG 2.2 AA)

Semantic landmarks and headings; every control keyboard-reachable with a visible focus ring (2px, token color, offset); labels tied to inputs; errors announced and linked; contrast ≥ 4.5:1 (3:1 for large text and UI parts) in both themes; status never by color alone (icon + text); 44 px touch targets; kanban and calendar have keyboard alternatives; live regions for punch, sync and toasts; `prefers-reduced-motion` and `prefers-contrast` respected; zoom to 200% without loss; timers do not steal focus. `axe` runs in CI on every key screen in both themes.

### 8.10 Localization

English and Nepali from day one (`packages/i18n`, ICU messages, feature namespaces, no hard-coded strings). BS/AD toggle on every date; BS conversion via lookup table in `packages/domain` (irregular month lengths), tested at year and fiscal-year boundaries (Shrawan start). Nepal time (UTC+05:45) default per org. Numbers in lakh/crore grouping; optional Devanagari numerals. Layouts survive 40% text expansion.

### 8.11 Performance budgets (mid-range Android, unstable 4G)

LCP < 2.5 s, INP < 200 ms, CLS < 0.1; initial JS ≤ 200 KB gz (shell); charts, maps, editor, XState visualizer lazy-loaded; fonts subset with `font-display: swap`; images AVIF/WebP, responsive; skeletons not spinners; optimistic punches and task moves; virtualized long lists. Enforced by Lighthouse CI.

---

## 9. MAKING IT FEEL HUMAN-DESIGNED (binding rules, not suggestions)

Why: generated UI clusters around the same tells. Avoid them deliberately; spend boldness in one place.

**9.1 One memorable thing per surface.** App: the Punch card and its confirmation. Marketing: a live, interactive clock-in demo in the hero (not a stat-and-gradient hero). Everything else stays calm.
**9.2 Surface hierarchy, not a card kit.** Not everything is a card. Use a hero surface, tinted panels, plain lists with dividers, and open layouts. Mixed radii per role (8.2). One consistent shadow recipe per elevation, never the same soft grey on everything.
**9.3 Color discipline.** One primary + marigold support + semantic colors. No gradient washes as decoration, no purple-to-blue gradients, no glow blobs, no lime or acid green. Tinted icon chips carry category meaning (attendance indigo, leave marigold, work teal, people rose, comms violet), not decoration.
**9.4 Typography discipline.** One family. No tracked-out ALL-CAPS eyebrow labels above every heading. No single-word accent color inside headlines. No `A · B · C` meta strings, no spaced em-dash labels, no "→" appended to buttons and links. Numbered markers only where the content is a true sequence (setup steps).
**9.5 Motion discipline.** No fade-up on every section, no hover lift on every card, no looping micro-animations. Motion only answers an action (punch, drag, approve, expand) or announces one meaningful change.
**9.6 Real content.** Nepali names, places, holidays, NPR, BS dates (8.8). Empty states show real next steps. No fake charts that cannot come from the API.
**9.7 Imagery and icons.** One icon set (lucide, one stroke weight), never emoji as icons. No stock photos. Illustrations, if any, are a small custom single-color-plus-tint SVG set (empty states, onboarding) that works in both themes. Avatars are initials on varied tints until photos exist.
**9.8 Imperfection with intent.** Asymmetric grids where content differs in importance; denser tables for HR, airier Home for staff; varied rhythm between sections. Align to a grid, then break it once on purpose.
**9.9 Process (do this before building each major screen):** (1) write a 5-line design plan (palette use, type roles, layout sketch, the one memorable element); (2) sketch two layout variants in ASCII and pick one with a reason; (3) build; (4) critique in both themes at 360/768/1280 and remove one decoration. Record in the feature README.
**9.10 AI-tell checklist (must pass before a screen is "done")**

- [ ] No ALL-CAPS eyebrows, no gradient decoration, no identical-card grids
- [ ] Mixed radii and elevations used with purpose
- [ ] No fade-up-on-scroll or hover-lift on every item
- [ ] Copy is specific to Nepal and to the task; no filler, no lorem
- [ ] Both themes reviewed; contrast checked; no pure #000 or #fff blocks
- [ ] Looks different from a default shadcn/Tailwind template (custom tokens, custom domain components)

---

## 10. FRONTEND ENGINEERING RULES

**Stack:** see Section 5A (authoritative list). Summary below is for orientation only.
**Summary:** React 19, Vite, React Router (data router, lazy routes), Tailwind CSS (consuming the tokens preset), shadcn/ui primitives copied as `.jsx` into `packages/ui` and restyled to the tokens (never ship defaults), TanStack Query, XState v5 (machines), Zustand, React Hook Form + Zod (schemas from `packages/validation`), Socket.IO client, Recharts (lazy), lucide-react, date handling via `packages/domain` (BS/AD) plus a small date library, Workbox (service worker), Vitest + Testing Library + MSW, Storybook, Playwright, axe.
Types: JSDoc on exported functions and shared packages, `// @ts-check` in `packages/*` for editor checking only. No `.ts` files, no TS build step.

**Data**

- One query-key factory per feature (`keys.js`); `staleTime` chosen per resource; mutations are optimistic where safe (punch, task move, mark read) with rollback and a visible failure.
- Cursor pagination with infinite lists on mobile; virtualized beyond ~100 rows.
- Sockets patch or invalidate cache; never hold server data in Zustand.
- API errors map to one `AppError` shape (`code`, `message`, `details`, `requestId`); UI shows `message` and the request ID under "Details".

**Components**

- Pages are thin; logic in hooks and `packages/domain`; presentational components take props and render states (no data fetching inside `packages/ui`).
- Forms: schema first, inline validation on blur, summary on submit, preserve input on error, autosave long forms as drafts.
- Tables: server-side sort/filter/pagination, column visibility, density, keyboard navigation, responsive to cards.
- Dates and numbers only through `packages/i18n` formatters. Strings only through i18n keys.
- Error boundary per route; global fallback offers reload and report with request ID.

**Quality**

- ESLint (a11y plugin, hooks, boundaries, no-restricted-syntax for raw colors/strings), Prettier, `knip`, Conventional Commits, PRs under ~400 changed lines, PR template with screenshots for light, dark, mobile, desktop.
- Bundle analysis on every PR; budget failures block merge.

**Security (frontend)**
No tokens in localStorage; sanitize any rich text (DOMPurify); no `dangerouslySetInnerHTML` without review; CSP-compatible (no inline scripts except the hashed theme script); validate and encode URL params; never trust client-side permission checks for security; no secrets in the bundle; third-party scripts need an ADR; permission for location/camera/notifications is requested in context with a plain explanation, never on load.

**Privacy UX:** a consent screen before first location use ("Location is read only when you clock in or out"); selfie/biometric steps appear only when org policy enables them and say what is stored; users can see and export their own attendance data.

---

## 11. MOBILE-READINESS (design now so the app is a skin, not a rewrite)

Path: **PWA now → Expo (React Native, JavaScript) later** ⚠️ (Capacitor only if the team wants zero RN skills; weaker background and push behavior).

Must be true from the first commit:

1. **Shared logic has no DOM.** `packages/domain`, `validation`, `permissions`, `api-client`, `i18n` (formatters), `design-tokens` import no `window`, `document` or CSS. The mobile app consumes them unchanged.
2. **Tokens export to RN** (`rn-theme.js`) with the same light/dark sets and the same user preference.
3. **Platform adapters behind interfaces:** `storage`, `secureStore`, `geolocation`, `camera`, `push`, `share`, `haptics`, `deepLink`, `connectivity`. Web implementations now; RN implementations later; features depend only on the interface.
4. **Navigation parity:** the PWA already uses bottom tabs (Home, Attendance, Work, Leave, More); routes map 1:1 to a native navigator; deep links defined now (`swams://leave/requests/:id`, `swams://attendance/today`).
5. **Touch-first sizing** (44 px targets, thumb-zone actions, sheets over modals) so components translate to native layout.
6. **Offline model** (7.2) is platform-neutral; the queue persists via the `storage` adapter.
7. **Push:** notification preferences UI and device registration flow exist behind a `push` adapter; web push where supported, FCM/APNs on native.
8. **PWA now:** manifest, maskable icons, install prompt after a successful first punch (not on load), offline shell, update-available toast, splash and theme-color matching the active theme, `display: standalone`, safe-area CSS. iOS limits (background sync, push permissions) are designed around, not ignored.
9. **Native-only extras later (not now):** background geofence, mock-location detection, biometric unlock, QR/NFC punch, haptics.
10. **Do not** add web-only dependencies to shared packages; each new package gets a "RN-safe?" line in its README.

---

## 12. DESIGN-TO-CODE PORTING CHECKLIST (from `SWAMS_Unified.html` and `SWAMS_Landing.html`)

**Parity matrix (nothing left behind)**

| Prototype item                                                                        | Route / feature                                                     | Release                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| Login                                                                                 | `auth`                                                              | R1                          |
| Dashboard (HR and Staff, with Frontend/Backend/QA/DevOps views)                       | `dashboard`                                                         | R1                          |
| Attendance                                                                            | `attendance`                                                        | R1                          |
| Work → Task Board                                                                     | `tasks`, `projects`                                                 | R2                          |
| Leave & Requests                                                                      | `leave`, `requests`                                                 | R1 / R2                     |
| Team (live availability, task load, department filter)                                | `team`                                                              | R1 directory, R2 live board |
| Messages                                                                              | `messages`                                                          | R3                          |
| Meetings                                                                              | `meetings`                                                          | R2                          |
| Video Call (participants, in-call chat, notes, REC)                                   | `video`                                                             | R2 link, R3 native          |
| Team Meetup (polls, vote, confirm, past meetups)                                      | `meetups`                                                           | R2                          |
| Calendar (unified) 🆕                                                                 | `calendar`                                                          | R2                          |
| AI Features                                                                           | `ai`                                                                | R3                          |
| User Personas, Journey Maps, Design System, Database Schema, UX Case Study, Portfolio | not product screens: move to `docs/` and marketing case-study pages | R0                          |
| Landing: hero, 8 modules, 3 steps, HR vs Staff, pricing teaser, demo CTA, light/dark  | `apps/marketing`                                                    | R1                          |

**Steps**

1. Copy both HTML files to `design-prototype/` read-only. Never edit them.
2. Extract every CSS custom property into `tokens.json`; reconcile with Section 8.2 (the proposed palette wins where they differ, after the owner confirms); produce `docs/design/token-diff.md`.
3. Inventory each screen into `docs/design/screen-inventory.md`: route, feature folder, components used, states needed, API calls needed, permissions, i18n namespaces, prototype section id.
4. Rebuild shared primitives and patterns first (Storybook, all states, both themes), then domain components, then pages.
5. Port behavior, not markup: clock timer, kanban drag/drop (with keyboard path), leave approve/reject with undo, poll voting, theme toggle, role switcher (becomes real role lens), toast system.
6. Replace in-memory arrays with api-client hooks against MSW; replace Font Awesome with lucide; replace inline styles with tokens; remove duplicated markup between HR and Staff shells (one AppShell, config-driven nav).
7. Fix known prototype gaps: staff Video Call section was missing from the staff dashboard (parity matrix covers it); cosmetic RBAC becomes real route/UI guards; add the missing states (loading, empty, error, denied, offline) on every screen.
8. Visual regression: compare each ported screen to the prototype screenshot (Playwright), then record intentional improvements in the screen inventory.
9. Done = parity matrix row checked, states complete, both themes, 360/768/1280, keyboard pass, axe clean, i18n en and ne, story per state, README updated.

---

## 13. MARKETING SITE (`apps/marketing`, Next.js static export)

Pages: Home, Features, Pricing, Nepal (BS calendar, Labour Act presets, NPR, local support), Security, Demo, Contact, Legal, Blog; each in `en` and `ne`. Hero is an interactive clock-in demo with sample Nepali data, not a stat-and-gradient hero. Pricing is shown as indicative until confirmed ⚠️ (landing prototype: NPR 499 Starter up to 25 users, NPR 899 Growth up to 200). Light/dark toggle in the header. SEO: per-page metadata, hreflang, sitemap, structured data; performance budget LCP < 2s; no cookie banners unless trackers are added. Case-study pages reuse the persona, journey and design-system material from the prototype.

## 14. TESTING

| Layer                                                                                             | Tool                                                           | Covers                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                                                                                              | Vitest                                                         | `packages/domain` (time math, BS calendar, leave/overtime previews, 100%), machines (every transition), formatters                                      |
| Component                                                                                         | Testing Library + Storybook interaction tests                  | each state, keyboard, ne, long text                                                                                                                     |
| Contract                                                                                          | MSW from OpenAPI                                               | requests/responses match the contract; fail on drift                                                                                                    |
| E2E                                                                                               | Playwright (mobile + desktop viewports, en + ne, light + dark) | login, setup wizard, clock in/out, offline punch then sync, correction, leave request and approval, task drag, poll vote, theme toggle persists, logout |
| Accessibility                                                                                     | axe in CI + manual keyboard/screen-reader pass                 | all key screens, both themes                                                                                                                            |
| Visual                                                                                            | Playwright snapshots                                           | key screens × 2 themes × 3 widths                                                                                                                       |
| Performance                                                                                       | Lighthouse CI                                                  | budgets in 8.11                                                                                                                                         |
| Offline/PWA                                                                                       | network emulation                                              | queued punch syncs once, no duplicates; update toast works                                                                                              |
| Coverage gates: domain ≥ 95%, machines 100% transitions, components ≥ 80%. A flaky test is a bug. |

## 15. CI/CD AND ENVIRONMENTS

PR: install (cached) → lint → unit/component → build → bundle budget → Storybook build → axe → visual diff → Playwright smoke on preview URL. Merge to `main`: deploy staging (static hosting on a CDN), smoke test; manual promote to production; automatic rollback by redeploying the previous build. Environments: local (MSW or local API), staging (seeded demo org, public sandbox that resets), production. Env vars are public by definition (prefix `VITE_`), listed in `.env.example` and `docs/ops/environment-variables.md`. Sentry release tagging with source maps.

## 16. DEFINITION OF DONE (every screen/feature)

Parity or design-plan row met · loading, empty, error, denied, offline states · light and dark verified · 360/768/1280 verified · keyboard and screen-reader pass · axe clean · i18n en and ne (no hard-coded strings) · BS/AD dates · permissions and entitlement guards · machine tested (if workflow) · MSW handlers and fixtures · Storybook stories per state · unit/component/E2E as applicable · bundle within budget · AI-tell checklist (9.10) passed · README and screen inventory updated · evidence pasted (commands run, results, screenshots).

## 17. DOCUMENTATION

```text
docs/
├── README.md (map)  ·  FRONTEND_PROMPT.md  ·  PROGRESS.md (agent ledger)
├── product/   personas.md · competitive-analysis.md · roadmap.md · nepal-notes.md
├── design/    design-principles.md · tokens.md · token-diff.md · components.md · patterns.md · accessibility.md
│              content-style-guide.md (en/ne glossary) · screen-inventory.md · theme.md · ai-tell-checklist.md
├── frontend/  architecture.md · state-ownership.md · machines.md · data-fetching.md · routing-and-guards.md · i18n.md
│              offline-and-pwa.md · mobile-readiness.md · testing.md · performance.md · coding-standards.md
├── adr/       0001-javascript-only.md · 0002-vite-app-next-marketing.md · 0003-xstate-for-workflows.md · 0004-theme-strategy.md ...
├── api-contract/ openapi.yaml (copied from backend) · contract-requests.md (what the UI needs and lacks)
└── ops/       environments.md · environment-variables.md · deployment.md · runbooks/
```

Docs change in the same PR as the code; every doc has an owner and "last verified" date.

## 18. BUILD ORDER (vertical slices; each ends with a demo-able, tested screen)

0. Skeleton, tooling, tokens (both themes), theme toggle, i18n skeleton, MSW, Storybook, CI.
1. Primitives and patterns (states, both themes). Shell: sidebar, topbar, bottom nav, command palette, guards, nav config.
2. Auth screens and session machine; org setup wizard.
3. Staff Home and **Punch** (machine, offline queue, geofence UX), Attendance history.
4. Corrections, Manager and HR attendance views, exceptions.
5. Leave: balance, request, approvals, holidays, BS/AD calendar.
6. Notifications, settings (appearance, language, roles matrix, policies), audit viewer.
7. Dashboards (Staff, Manager, HR) wired to real endpoints, reports and CSV export UI.
8. Work: tasks, kanban (drag + keyboard), projects, workload; Team live board and directory; Calendar; Meetings; Meetup polls.
9. Marketing site. Console UI.
10. Messages, Video, AI, mobile spike (Expo proof using shared packages).

## 19. OPEN DECISIONS (do not decide silently)

1. Brand color and final palette (proposal in 8.2) · 2. Typeface after dual-script rendering test · 3. Vite + Next.js split vs Next.js for both · 4. XState vs reducers only · 5. Map/tile provider for the geofence editor · 6. Video approach (link vs native, provider) · 7. Selfie/face step: build, buy or skip · 8. Expo vs Capacitor · 9. Shortcut for theme toggle and command palette conventions · 10. Final pricing and free tier shown on marketing · 11. Illustration style (custom set vs none) · 12. Nepali typography review owner.

## 20. FIRST TASK (do only this, then stop and report)

1. Confirm you read this file; list contradictions or ambiguities and your proposed resolutions.
2. Create the monorepo per Section 6 with tooling, boundary rules, generators, `CLAUDE.md`, `.env.example`, CI skeleton, Storybook, Vitest, Playwright, MSW.
3. Implement `packages/design-tokens` (light + dark from 8.2), the pre-paint theme script, `ThemeToggle` (Light/Dark/System), and a Storybook "Foundations" page showing colors, type (Latin + Devanagari), spacing, radii, elevation and motion in **both themes**.
4. Produce `docs/design/screen-inventory.md` and `token-diff.md` from the two prototype files, plus ADRs 0001 to 0004.
5. Show a design plan for Staff Home (9.9: palette use, type roles, two ASCII layout variants, the chosen one and why).
6. Run `pnpm install && pnpm lint && pnpm test && pnpm build && pnpm storybook:build`; paste results. Stop and wait for approval.

Report format for every task:

```text
## Task  ## Analysis (FACT / ASSUMPTION / OPINION)  ## Design plan (if a screen)  ## Changes (files)
## States covered  ## Themes and widths checked  ## i18n and BS/AD  ## Accessibility
## Tests (added, results)  ## Docs updated  ## Evidence  ## Open decisions  ## Next step
```

**Target outcome:** a fast, accessible, bilingual, light-and-dark web app and marketing site for Nepal's SMEs that feels designed by people who know the market, built on shared packages so the mobile app later is a new skin on the same brain.
