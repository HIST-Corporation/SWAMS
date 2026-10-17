# Security hardening summary

The middleware stack in `src/app.js` is ordered as declared in its header:
**security (helmet) → CORS (frontend origins) → request id → body parsing →
cookie → rate limit → routes → 404 → error envelope**. None of the
following controls are cosmetic; each is enforced on the server.

| Control | Mechanism | Notes |
| ------- | --------- | ----- |
| **Helmet** | `helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } })` | `x-powered-by` disabled; CSP relaxed for the SPA dev stack. |
| **CORS** | Origin allowlist from `CORS_ORIGINS` (comma-separated); no Origin → same-origin tools pass; `credentials: true`; exposes `X-Request-Id`, `X-Idempotent-Replayed`. |
| **Rate limiting** | `general` (120/min) + `auth` (20/min) per IP, `draft-7` headers, JSON `rate_limited` envelope. Auth limiter is separate so login isn't throttled by general traffic. |
| **Idempotency** | `Idempotency-Key` / `idempotencyKey` body field; first response replayed for 24h in `idempotency_keys` table; fail-open on DB error so punch never blocks. |
| **JWT** | Short-lived access token (`JWT_ACCESS_TTL`, default 15m); refresh via `swams_rt` httpOnly cookie (`JWT_REFRESH_TTL`); secrets validated ≥ 32 chars at startup. |
| **Scope enforcement** | `scopeFor` + `scopedWhere` + `assertInScope` derive the Prisma where clause from the principal; staff/manager/team_lead requests beyond their lens → `403 out_of_scope`. |
| **RBAC** | `requirePermission` (permission flags) and `requireRole` (role gate) on the workforce routes; platform console is a separate realm. |
| **Audit trail** | `auditLog` table; `audit()` is append-only and never logs tokens/passwords (allow-listed details). |
| **Input validation** | `zod` schemas per route (`validate`); dates/types must match (`YYYY-MM-DD`, enum periods, etc.). |
| **Error hygiene** | Error middleware never leaks stacks in production; only `code/message/details/requestId` is rendered. |
| **Liveness** | `/health` is unauthenticated and never exposes config or data. |

## Hardening checks

- `[ ]` `node --check` passes on every edited route (`node --check src/modules/dashboard/routes.js`).
- `[ ]` `npm run lint` is clean — ESLint with `--max-warnings 0`.
- `[ ]` `npm run test:integration` passes — the suite asserts scopes, errors, and
  envelope shapes, not only 200s.
- `[ ]` `npm run openapi:lint` passes on `openapi.yaml`.
- `[ ]` `prisma migrate status` clean (app matches schema).
- `[ ]` HTTPS/secure cookies only deployed behind a TLS terminator (cookie flags handled by `env.cookieSecure`).
