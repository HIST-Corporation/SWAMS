# Testing the backend

## Prerequisites

- Node >= 20.11 (`packageManager: pnpm@11.22.0`).
- PostgreSQL reachable at `localhost:5432` with a `swams` user (see `Backend/.env.example` pattern:
  `postgresql://swams:swams@localhost:5432/swams`).
- Prisma client generated: `npm run prisma:generate`.

## Integration tests (`tests/`)

The suite uses Node's built-in test runner + `supertest` against the
seeded, isolated database. Each test file forces `NODE_ENV=test` and the
test `DATABASE_URL` **before** any `src` module loads (env.js is a
process-wide singleton).

1. Bootstrap the isolated test database (once):

   ```bash
   npm run test:setup
   ```

   This creates `swams_test`, applies the 2 migrations, and seeds demo data
   (20 users, org, teams, departments, leave types, pending leave requests).

2. Run the suite:

   ```bash
   npm test            # or: npm run test:integration
   ```

3. What the suite covers:

   - `tests/auth.test.js` — login, token, 401/400 envelopes.
   - `tests/contract-dashboard.test.js` — scope behavior of `/org/dashboard`,
     `/presence`, `/org/overview`, `/staff/board`.
   - `tests/contract-reports.test.js` — report rows, CSV export, analytics.
   - `tests/contract-aux.test.js` — notifications, audit, tasks, attendance team
     board, platform console, root 404.

## Contract checks

| Command                   | What it validates                                      |
| ------------------------- | ------------------------------------------------------ |
| `npm run openapi:lint`    | Structural validation of `openapi.yaml` (contract 35)  |
| `npm run lint`            | ESLint, `--max-warnings 0`                             |
| `npm run format:check`    | Prettier check                                         |
| `npx prisma migrate status` | Migrations vs. schema — must be clean               |

## What is intentionally not covered by `?type=` / `?period=`

CSV/analytics endpoints require explicit query parameters
(`?type=attendance`, `?period=week`) — the harness and scripts do not pass
them, so those rows are checked via direct API calls in the tests above.

## Seed data notes

- Seed IDs are fixed strings (`u_sarah`, `u_priya`, `u_ramesh`, …) for cross-app fixture parity.
- The seed is idempotent (upserts on stable keys), so re-seeding is safe.
- The test database is a *copy* of the dev DB; do not point tests at the
  shared `swams` database while the harness mutates rows.
