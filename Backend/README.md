# SWAMS backend — API

JavaScript-only Express modular monolith. Serves the workforce API under
`/api/v1`, the platform console under `/api/v1/platform`, and the
unauthenticated liveness probe at `/health`.

## Layout

```
src/
  app.js             Express app factory (middleware order is contractual)
  server.js          Entry point (loads env, builds app, listens)
  common/            errors, async handler, http helpers, time, validate, logger
  config/            env schema (zod) and constants (roles, scopes, permissions)
  db/                prisma client + connection helper
  middleware/        auth, scope, idempotency, rate limit, audit, request id, ...
  modules/
    auth/            login / refresh / logout / forgot-password
    platform/        console realm (separate cookie, no business scopes)
    dashboard/       presence, org overview, org dashboard, staff board
    reports/         report rows, CSV export, analytics series
    notifications/   bell + read-all/read-one
    audit/           audit trail (audit.read required)
    tasks/           task board, lanes, templates, revisions
    attendance/      punch (idempotent), history, team board, corrections
    leave/           leave balance, holidays, request queue
    me/              current session user
    health/          /health probe
prisma/              schema, migrations, seed
scripts/             repo helpers (e.g. openapi:lint)
tests/               node:test + supertest integration suite
```

## Scripts

| npm script        | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | `node --watch src/server.js` (auto-reload)                     |
| `npm start`       | `node src/server.js` (production)                              |
| `npm test`        | Run the `tests/` integration suite (node:test + supertest)     |
| `npm run test:integration` | Bootstrap `swams_test` DB, seed it, then `npm test` |
| `npm run lint`    | ESLint (`--max-warnings 0`)                                    |
| `npm run format`  | Prettier rewrite                                             |
| `npm run format:check` | Prettier check                                          |
| `npm run db:migrate`     | `prisma migrate dev` (local)                          |
| `npm run db:seed`        | `node prisma/seed.js` (idempotent, fixed IDs)         |
| `npm run openapi:lint`   | Structural validation of `openapi.yaml` (contract row 35) |

## Scope model (server truth, contract request 30)

| Role        | Data scope   |
| ----------- | ------------ |
| staff       | `self`       |
| team_lead   | `team`       |
| manager     | `department` |
| hr / owner  | `organization`|
| super_admin | `platform` (console) |

Every route enforces the scope server-side; the response `scope` field
reflects the principal's lens. Out-of-scope reads return HTTP `403`
with `code: out_of_scope`. Unauthenticated requests return `401`,
unknown routes `404` — the envelope shape matches
`packages/api-client`'s `AppError` (`{ code, message, details, requestId }`).
