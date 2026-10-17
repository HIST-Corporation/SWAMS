# Gap analysis — master prompt vs. repository (audit)

**Last verified:** 2026-10-10 · Auditor: build agent · Sources: this repo (`apps/`, `packages/`, `docs/`),
`docs/FRONTEND_PROMPT.md` (binding contract), the pasted **SWAMS Frontend Master Prompt**, and
`docs/design/screen-inventory.md`.

Legend: ✅ built & verified · 🟡 partial · ❌ missing. "Evidence" = a file or command, not a promise.

## 0. Method

The binding build order is `FRONTEND_PROMPT.md` §18 (10 vertical slices). The pasted master prompt is
broader but consistent; where it adds ceremonies (docs set §28, phases §29) this document reports
the gap and the slice that fills it. Nothing here claims work that was not executed — unrun checks
are listed as NOT RUN.

## 1. Slice status (FRONTEND_PROMPT §18)

| #   | Slice                                                                                           | Status | Evidence / gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Skeleton, tooling, tokens (both themes), theme toggle, i18n skeleton, MSW, Storybook, CI        | ✅     | `packages/design-tokens/*`, `packages/ui/src/theme/ThemeProvider.jsx`, `.github/`, `vitest.config.js`, `apps/web/src/mocks/*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1   | Primitives + patterns; shell (sidebar, topbar, bottom nav, command palette, guards, nav config) | 🟡     | Shell + nav + guards built (`apps/web/src/shell/*`, `app/nav.config.js`, `app/nav-access.js`). Primitive set is partial — see §3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2   | Auth screens + session machine; org setup wizard                                                | ✅     | `features/auth/*`, `features/onboarding/*`, session/orgSetup machines + tests. `docs/PROGRESS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3   | **Staff Home + Punch (machine, offline queue, geofence UX), attendance history**                | 🟡     | Shipped 2026-10-09 (see `PROGRESS.md`): punch + offline-queue machines, pre-flight policy, hero card, `/attendance`, `/attendance/history`, mocks, 58 tests. Queue persistence across reloads shipped 2026-10-11 (`queueStorage.js`). **Open:** BS/AD dates (blocked on the converter); service-worker background sync + the `?scenario=offline` browser walk (PWA slice remainder)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 4   | Corrections, Manager/HR attendance views, exceptions                                            | ✅     | Completed 2026-10-11: `CorrectionsPage` + queue + correction machine + tests, and now `/attendance/team` — the manager/HR board behind `attendance.approve`: server-owned summary tiles, the presence list (`TeamBoardRow`), and the "Needs attention" exceptions band (`TeamExceptions`, linking into the correction queue). One `GET /attendance/team` request (contract row 24) owns presence, exceptions and the summary so the three can never disagree. HR opens it from the attendance header; staff never sees the link and is guard-denied. 10 new unit tests (6 page/contract + 4 row/ne) + 2 e2e flows                                                                                                                                                                                                                                                                            |
| 5   | Leave: balance, request, approvals, holidays, BS/AD calendar                                    | 🟡     | `LeavePage` + BalanceRail/LeaveForm/ApprovalQueue + mocks + tests built 2026-10-10; holidays shown; BS/AD calendar blocked on the converter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6   | Notifications, settings (appearance, language, roles matrix, policies), audit viewer            | 🟡     | **Shipped 2026-10-10 (parts 1–3):** notifications panel + unread badge in the topbar (was a dead button), `/settings` (appearance, language + read-only roles matrix over the canonical bundles) behind `settings.manage`, preferences PATCH merge, `/audit` read-only log (filters + server pagination, staff denied by guard). 44 new unit tests, all passing; e2e covers HR flows + staff denial. **Still open:** roles-assignment editing + org policies (need the roles/settings API)                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7   | Dashboards (Staff/Manager/HR) on real endpoints, reports + CSV                                  | 🟡     | `HomePage` redesigned 2026-10-10 (WelcomeHero, StatRail, NeedsYou, tasks, presence); **reports + CSV shipped 2026-10-10**: `/reports` (attendance/leave/tasks × AD date range) behind `reports.read`, server-rendered CSV export from the same derivation as the table, 16 new unit tests + e2e download check. **2026-10-12:** the reviewer Home now composes the prototype's whole `#page-dashboard` (attendance trend + target, department rates, insights, today's meetings, industry benchmark, Export) from ONE new mock payload, `GET /org/dashboard` (contract request 25); the org panels that have no endpoint carry a `PreviewNotice` naming that scope. **Open:** dashboards on the real backend contract (request 25); HR org-level analytics (R3)                                                                                                                              |
| 8   | Work (tasks, kanban, projects), Team board + directory, Calendar, Meetings, Meetup polls        | 🟡     | **Task board + Calendar shipped 2026-10-10/11**: `/work/tasks` kanban (5 lanes, drag + full keyboard path with live-region announcements, optimistic moves that roll back with the server's reason, Review-needs-reviewer and Revision-needs-note rules, inline create); `/calendar` month grid (leave/holiday/meeting events pre-grouped by day server-side, Nepal-timezone cursor, a real ARIA grid — rows of gridcells, one roving tab stop, arrow/Home/End/PageUp/PageDown navigation that steps the month at the edges — day cells with full accessible names, events repeated in words below the grid, month navigation announced). Home `TodayTasks` reads the same store's `?due=today` view. 24 new unit tests + 3 e2e flows. **Open:** projects, task detail drawer, WIP limits (need policy contract), calendar week/day views; team/meetings/meetup/video stay labelled previews |
| 9   | Marketing site, Console UI                                                                      | 🟡     | Marketing home (`Hero`, `Modules`, `Workflow`, `Roles`, `Pricing`, `DemoCta`, `Header`, `Footer`) with anchor-only links; console still a shell                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 10  | Messages, Video, AI, mobile spike                                                               | 🟡     | `messages`/`video` preview pages (labeled `PreviewNotice`); AI + mobile not started                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 2. Cross-cutting infrastructure required by the prompt

| Requirement (prompt)                                 | Status | Gap                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline queue machine (§7.2)                         | ✅     | `features/attendance/machines/offline-queue.machine.js` built + tested (dedupe, ordering, backoff, `flushFailed`); persisted across reloads via `features/attendance/queueStorage.js` (localStorage, unsent items only, interrupted `sending` → `queued`, corrupt/dead storage → `[]`; 6 tests) |
| `packages/domain` time/BS/fiscal math                | 🟡     | `time.js` (workedMinutes, overtimePreview, drift) + `fiscal.js` + `geo.js` (haversine fence) exist; **BS converter missing** (Open Decision)                                                                                                                                                    |
| Permission/entitlement guards                        | ✅     | `packages/permissions`, `app/RequirePermission.jsx`, `nav-access.js`                                                                                                                                                                                                                            |
| i18n en + ne, feature namespaces                     | 🟡     | `common` + `nav` + `attendance` + `dashboard` + `messages` + `meetings` + `team` + `video` + `leave` + `marketing` + `notifications` + `settings` (en/ne parity, catalog test); new features still add own catalog                                                                              |
| BS/AD dual dates                                     | ❌     | `formatDateAd` deliberately omits BS until a verified converter lands                                                                                                                                                                                                                           |
| PWA (manifest, icons, service worker, offline shell) | 🟡     | Offline queue now persists (`queueStorage.js`, §7.2); still missing: `vite-plugin-pwa` install, `public/manifest.webmanifest`, offline shell, background sync, install prompt                                                                                                                   |
| Error boundaries                                     | 🟡     | `app/error-boundary/RouteError.jsx` per route; no global fallback + report path                                                                                                                                                                                                                 |
| Observability (Sentry / error reporting)             | ❌     | not installed; `docs/frontend/observability.md` absent                                                                                                                                                                                                                                          |
| Performance budgets + Lighthouse CI                  | ❌     | `docs/frontend/performance-budget.md` absent; budgets not measured                                                                                                                                                                                                                              |
| Playwright e2e + axe                                 | 🟡     | `apps/web/e2e/theme.spec.js` — 10 tests (desktop + mobile), all passing; axe not yet wired                                                                                                                                                                                                      |
| Storybook stories per state                          | 🟡     | `packages/ui` has a few stories/tests; no `Foundations` page, no per-state story rule enforced                                                                                                                                                                                                  |
| Visual regression (2 themes × 3 widths)              | ❌     | not set up                                                                                                                                                                                                                                                                                      |

## 3. Component inventory (FRONTEND_PROMPT §8.7) — what exists

**Built (`packages/ui`):** Button (+stories/test), IconButton, Input, Textarea, Checkbox, Switch,
Badge, Avatar, Skeleton, FormField, EmptyState, ErrorState, StatTile, CommandPalette, Stepper,
Toast, ThemeToggle.

**Feature-local components (promote to `packages/ui` when a second feature needs them):**
PunchCard, TimerRing, PunchHistoryRow, PunchStatusNote, CorrectionForm/List/Queue,
BalanceRail, LeaveForm/List, ApprovalQueue, NotificationBell/Row, WelcomeHero,
StatRail, NeedsYou, TodayTasks, PresenceMeter, TodayTimeline, UpcomingEvents,
TeamPresence, TeamTodaySummary.

**Missing primitives:** Select/Combobox, Radio, Tooltip, Popover, Menu/Dropdown, Dialog, Sheet,
Tabs, Breadcrumb, Pagination, Progress, Ring, Banner, DatePicker (BS/AD), TimePicker.

**Missing patterns:** DataTable (sort/filter/bulk/responsive-to-cards), FilterBar, PermissionDenied
screen component, OfflineBanner (banner exists inline in AppShell), SyncChip, ApprovalRow,
NotificationItem, DateCell.

**Built in slice 3 (feature-local for now — promote to `packages/ui` when a second feature needs them):**
PunchCard, TimerRing, PunchHistoryRow, PunchStatusNote.

**Missing domain-ui:** LeaveBalanceRing, PresenceBadge, KanbanBoard/Lane/TaskCard, TaskDrawer,
CalendarGrid, PollOption, MeetingCard, CallStage, Heatmap, OrgChart.

## 4. Documentation (master prompt §28 / FRONTEND_PROMPT §17)

Present: `docs/README.md`, `FRONTEND_PROMPT.md`, `PROGRESS.md`, `design/{screen-inventory,staff-home-plan,
token-diff}.md`, `frontend/stack.md`, `api-contract/contract-requests.md`, `adr/0001–0004`.

Missing (❌): `product/{competitive-design-review,personas,roadmap,nepal-notes}.md` ·
`design/{design-principles,design-tokens,theme,components,patterns,accessibility,content-style-guide,
ai-tell-checklist}.md` · `frontend/{architecture,state-ownership,route-screen-permission-matrix,
api-contract-coverage,accessibility-checklist,media-and-uploads,observability,performance-budget,
requirements-to-tests,testing}.md` · `ops/{environments,environment-variables,deployment}.md`.

## 5. Marketing site (master prompt §8 / FRONTEND_PROMPT §13)

Routes required: `/`, `/features`, `/features/*`, `/solutions`, `/pricing`, `/about`, `/contact`,
`/demo`, `/security`, `/privacy`, `/terms`, `/ne`. Built: a single static `page.jsx` + `Header.jsx`.
Pricing copy is an **Open Decision** (§19.10) — must not be invented.

## 6. Console (platform admin)

`apps/console` has `main.jsx` + build config only. Separate deploy + auth realm is an ADR-level
decision that is not yet recorded.

## 7. Taken in this task: slice 3 (done, evidence in `PROGRESS.md`)

**Staff Home + Punch** — punch state machine (§7.1, 24 tests), offline queue machine (§7.2, 14
tests), pre-flight geofence policy (+`packages/domain/geo.js`, 12 tests), attendance hooks/mocks
(8 contract tests), `PunchCard`/`TimerRing`/`PunchStatusNote`/`PunchHistoryRow` (5 component tests),
`/attendance` + `/attendance/history`, the `attendance` i18n namespace (en + ne), route + nav wiring.
Also repaired the broken `session.machine.test.js`/`authApi.js` left by the previous turn, and added
a `hasSession` guard so a session-less auth response can no longer sign a user in.

Design plan and mock limits: `apps/web/src/features/attendance/README.md`.

**Still open from slice 3:** queue persistence across reloads (PWA slice), BS/AD dates (blocked on
the converter, request #1 below), the browser walk of the offline/queued UI, and a dark-theme pass
at 360/768/1280 after the final edit.

## 8. Open decisions blocking full completion (carried from §19)

1. Brand color / final palette — token values shipped per §8.2 proposal, owner confirmation pending.
2. BS↔AD converter — blocks every dual-date screen; a contract request exists.
3. Pricing on marketing — blocks `/pricing`.
   Maps provider (geofence editor), video provider, selfie step, Expo vs Capacitor — block later slices only.
