# SWAMS — Six-Role Permission Matrix

**Date:** 2026-10-13 · **Status:** implemented in `packages/permissions` (bundles + scopes), the demo sessions (`apps/web/src/mocks`), the login persona cards, the dashboard composition (`dashboardView`) and the platform console (`apps/console`).

This matrix is the frontend's authorization _model_ — what each role may see and do in the UI. It is **not a security boundary**: there is no backend yet, all data is MSW fixtures, and only the server can enforce any of this (contract requests 30–31). Frontend guards exist so the UI never _offers_ an action the role cannot take; they must never be relied on for protection.

---

## 1. The six core roles

| #   | Role (principal.role) | Business meaning           | Application                                       | Data scope (`scopeFor`) |
| --- | --------------------- | -------------------------- | ------------------------------------------------- | ----------------------- |
| 1   | `super_admin`         | Platform administrator     | **apps/console only** — never signs into apps/web | `platform`              |
| 2   | `owner`               | CEO / executive leadership | apps/web (executive dashboard)                    | `organization`          |
| 3   | `hr`                  | HR manager                 | apps/web                                          | `organization`          |
| 4   | `manager`             | Department manager         | apps/web                                          | `department`            |
| 5   | `team_lead`           | Team lead / supervisor     | apps/web                                          | `team`                  |
| 6   | `staff`               | Individual contributor     | apps/web                                          | `self`                  |

Job title ≠ role ≠ permission: a person's title (roster `jobKey`) is display copy; the role is the session's `principal.role`; permissions come from the role bundle, explicit grants, or explicit denials (`can()` reads denials first, then explicit grants, then the bundle). A person may hold multiple roles server-side; the frontend accepts an explicit `permissions` list on the principal as the override.

## 2. Permission bundles (implemented in `packages/permissions/src/bundles.js`)

| Permission            | staff | team_lead | manager | hr  | owner | super_admin |
| --------------------- | ----- | --------- | ------- | --- | ----- | ----------- |
| attendance.read       | ✅    | ✅        | ✅      | ✅  | ✅    | ❌          |
| attendance.write      | ✅    | ✅        | ✅      | ✅  | ✅    | ❌          |
| attendance.approve    | ❌    | ✅        | ✅      | ✅  | ❌    | ❌          |
| attendance.correct    | ❌    | ❌        | ✅      | ✅  | ❌    | ❌          |
| leave.read / create   | ✅    | ✅        | ✅      | ✅  | ✅    | ❌          |
| leave.approve         | ❌    | ✅        | ✅      | ✅  | ❌    | ❌          |
| leave.configure       | ❌    | ❌        | ❌      | ✅  | ❌    | ❌          |
| tasks.read / write    | ✅    | ✅        | ✅      | ✅  | ✅    | ❌          |
| tasks.manage          | ❌    | ✅        | ✅      | ✅  | ❌    | ❌          |
| projects.manage       | ❌    | ❌        | ✅      | ✅  | ❌    | ❌          |
| team.read             | ✅    | ✅        | ✅      | ✅  | ✅    | ❌          |
| team.manage           | ❌    | ❌        | ✅      | ✅  | ❌    | ❌          |
| users.manage          | ❌    | ❌        | ❌      | ✅  | ❌    | ✅          |
| roles.manage          | ❌    | ❌        | ❌      | ✅  | ❌    | ✅          |
| reports.read          | ❌    | ✅        | ✅      | ✅  | ✅    | ❌          |
| analytics.read        | ❌    | ❌        | ❌      | ✅  | ✅    | ❌          |
| settings.manage (org) | ❌    | ❌        | ❌      | ✅  | ✅    | ✅          |
| billing.manage        | ❌    | ❌        | ❌      | ❌  | ✅    | ✅          |
| audit.read            | ❌    | ❌        | ❌      | ✅  | ❌    | ✅          |
| ai.use                | ❌    | ❌        | ❌      | ✅  | ❌    | ❌          |
| meetings.manage       | ❌    | ✅        | ✅      | ✅  | ✅    | ❌          |
| messages.moderate     | ❌    | ❌        | ❌      | ✅  | ❌    | ❌          |

**Two separations this table encodes (both unit-tested in `permissions.test.js`):**

1. **Super Admin ≠ CEO.** `super_admin` holds platform administration only (`users.manage`, `roles.manage`, `settings.manage`, `billing.manage`, `audit.read`) and **zero business data** — an administrator can unseat a user, not read their attendance. `owner` reads the whole organization but holds no technical-admin or people-admin permissions.
2. **Executive ≠ operator.** The CEO sees everything (read) and owns billing/settings, but approvals (`leave.approve`, `attendance.approve`) and people administration stay with HR and managers.

## 3. Route and feature access (apps/web)

| Route / feature                                        | Required permission                  | staff          | team_lead               | manager   | hr        | owner     |
| ------------------------------------------------------ | ------------------------------------ | -------------- | ----------------------- | --------- | --------- | --------- |
| `/dashboard`                                           | session                              | personal board | **team board**          | org board | org board | org board |
| `/attendance` (own punch)                              | attendance.read+write                | ✅             | ✅                      | ✅        | ✅        | ✅        |
| `/attendance/history`                                  | attendance.read                      | ✅             | ✅                      | ✅        | ✅        | ✅        |
| `/attendance/team`                                     | attendance.approve                   | ❌             | ✅ (team scope, server) | ✅        | ✅        | ❌        |
| `/attendance/corrections`                              | attendance.read (+approve for queue) | own only       | own + team queue        | ✅        | ✅        | own only  |
| `/leave` (request + own list)                          | leave.read                           | ✅             | ✅                      | ✅        | ✅        | ✅        |
| leave approval queue                                   | leave.approve                        | ❌             | ✅                      | ✅        | ✅        | ❌        |
| `/work/tasks`                                          | tasks.read                           | ✅             | ✅                      | ✅        | ✅        | ✅        |
| task assignment                                        | tasks.manage                         | ❌             | ✅                      | ✅        | ✅        | ❌        |
| `/team` (directory)                                    | team.read                            | ✅             | ✅                      | ✅        | ✅        | ✅        |
| `/messages` `/meetings` `/video` `/meetup` `/calendar` | team.read                            | ✅             | ✅                      | ✅        | ✅        | ✅        |
| `/reports`                                             | reports.read                         | ❌             | ✅                      | ✅        | ✅        | ✅        |
| `/analytics`                                           | analytics.read                       | ❌             | ❌                      | ❌        | ✅        | ✅        |
| `/settings` `/setup`                                   | settings.manage                      | ❌             | ❌                      | ❌        | ✅        | ✅        |
| `/audit`                                               | audit.read                           | ❌             | ❌                      | ❌        | ✅        | ❌        |
| billing (nav, disabled R3)                             | billing.manage                       | ❌             | ❌                      | ❌        | ❌        | ✅        |
| **apps/console**                                       | console session (separate realm)     | ❌             | ❌                      | ❌        | ❌        | ❌        |

`super_admin` uses apps/console only: platform overview, organizations, admin accounts, system health — all fixture-labelled until contract 31 lands.

## 4. Data scopes (design framework)

- **self** — own attendance, leave, tasks, profile. Default for staff and for any unknown principal.
- **team** — an assigned team's records: team attendance board, team leave approvals, team task queue. `team_lead`.
- **department** — an authorized department: department-filtered org board, department reports. `manager`.
- **organization** — whole-company reads: org dashboard, analytics, benchmarks. `hr`, `owner`.
- **platform** — tenants, platform accounts, platform health. `super_admin` (console).

`scopeFor(principal)` in `packages/permissions/src/scopes.js` implements the mapping; an explicit `principal.scope` from the session payload wins over the role default. The web dashboard maps scope → composition via `apps/web/src/features/dashboard/utils/scope.js` (`org` / `team` / `personal`).

## 5. Sensitive data and administrative boundaries

- **Employee personal information, contracts, payroll:** no payroll UI exists; employee personal fields are confined to the team directory's display copy. Backend must still restrict fields per role (contract request 30).
- **Audit records:** HR only in the workforce app; `super_admin` reads platform audit in the console. The two must remain separate event streams server-side.
- **Billing:** `owner` (org billing) and `super_admin` (platform billing) — distinct operations that must never share an endpoint scope.
- **Org setup (`/setup`):** `settings.manage` — HR or owner. Not managers.

## 6. Known limitations (honest)

- All checks are client-side UX gates over MSW fixtures. **No production security exists until the backend enforces the same matrix on every request.**
- The department filter for `manager` is not yet applied server-side — the mock `GET /org/dashboard` returns company-wide figures. Recorded as contract request 30 (scope-aware payloads).
- `team_lead` sees the same team-board fixture as HR in the mock; per-team scoping is also contract request 30.
- Multi-role assignment is supported by the model (explicit `permissions` on the principal) but not exercised by any demo session yet.
