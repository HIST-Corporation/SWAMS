# Contract matrix (rows 1–35)

Backend routes are verified against the frontend mock parity layer and the
frontend's `packages/api-client` envelope. Every row below is covered by a
test in `tests/`; contract row 35 (`openapi.yaml`) is validated by
`npm run openapi:lint`.

| # | Contract subject | Route | Scope | Status |
|---|------------------|-------|-------|--------|
| 1 | Env fail-fast at startup (zod, `NODE_ENV`) | `config/env.js` | — | ✅ |
| 2 | Policy results (location, shift, workday minutes) | `GET /attendance/policy` | org | ✅ |
| 3 | Punch idempotency (24h replay, `X-Idempotent-Replayed`) | `POST /attendance/punch` | self | ✅ |
| 4 | Login returns `accessToken` + `session` | `POST /auth/login` | — | ✅ |
| 5 | MFA step-up (mfaRequired) | `POST /auth/mfa` | — | ✅ |
| 6 | Refresh token rotation (`swams_rt` cookie) | `POST /auth/refresh` | — | ✅ |
| 7 | Logout revokes refresh + clears cookie | `POST /auth/logout` | — | ✅ |
| 8 | Password reset (enumeration-safe 202) | `POST /auth/forgot-password` | — | ✅ |
| 9 | Generic `401` for missing/invalid token | `requireAuth` | — | ✅ |
| 10 | Generic `403` for RBAC gap (`requirePermission`) | middleware/auth.js | — | ✅ |
| 11 | Task board rows/lanes/revisions/canManage | `GET /tasks` | session | ✅ |
| 12 | Presence strip scope (self / team / dept / org) | `GET /presence` | per role | ✅ |
| 13 | Org overview counters | `GET /org/overview` | org | ✅ |
| 14 | Trend sessions not in scope chain (TDZ fix) | `dashboard/routes.js` | org | ✅ |
| 15 | Dashboard KPI/presence/trend/depts/benchmarks | `GET /org/dashboard` | per role | ✅ |
| 16 | `GET /staff/board` for non-staff → 403 | `staff/board` | staff | ✅ |
| 17 | Notifications bell (read-only) | `GET /notifications` | self | ✅ |
| 18 | Notification payload shape, `audience` never leaked | `toRow` | self | ✅ |
| 19 | Notification create (`callRequested` only) | `POST /notifications` | self | ✅ |
| 20 | Audit trail, `audit.read` required | `GET /audit` | audit.read | ✅ |
| 21 | Report rows JSON (`type`, `from`, `to`) | `GET /reports` | per scope | ✅ |
| 22 | Task board compact `?due=today` view | `GET /tasks?due=today` | session | ✅ |
| 23 | Leave request queue (pending/approved/calculated) | `GET /leave/requests` | per scope | ✅ |
| 24 | Attendance month calendar (`?month=YYYY-MM`) | `GET /attendance/calendar` | per scope | ✅ |
| 25 | HR → `organization` dashboard; staff → 403 | `GET /org/dashboard` | per role | ✅ |
| 26 | Staff board persona ownership | `GET /staff/board` | staff | ✅ |
| 27 | Task create/update/close validation | `POST /tasks`, `PATCH /tasks/:id` | per scope | ✅ |
| 28 | Analytics series (`period=week|month|year`) | `GET /reports/analytics` | org | ✅ |
| 29 | Notification create per request | `POST /notifications` | self | ✅ |
| 30 | Data scope enforcement (server truth) | everywhere | per role | ✅ |
| 31 | Platform console realm, separate cookie, no business scopes | `/platform/*` | platform | ✅ |
| 32 | Staff reads only own rows; manager/HR team scope | `GET /tasks` etc. | per scope | ✅ |
| 33 | Rate limiting (general + auth) | `buildRateLimiters` | — | ✅ |
| 34 | Security headers (helmet, no x-powered-by, CORS allowlist) | `app.js` | — | ✅ |
| 35 | OpenAPI contract lint (`openapi.yaml`) | `scripts/lint-openapi.mjs` | — | ✅ |

## Error envelope (matches `packages/api-client`)

```json
{ "code": "out_of_scope", "message": "Requested resource is outside your data scope", "details": null, "requestId": "req_123" }
```

Codes: `unauthorized` (401), `forbidden` (403), `not_found` (404), `invalid_*`
(422), `out_of_scope` (403), `rate_limited` (429), `internal` (500).
