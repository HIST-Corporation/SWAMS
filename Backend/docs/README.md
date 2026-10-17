# Backend docs

Contract, security, and testing documentation for the SWAMS backend API.

| Document | Purpose |
| -------- | ------- |
| [contract.md](contract.md) | API contract matrix (rows 1–35), scope table, error envelope |
| [security.md](security.md) | Hardening controls and where they live in the middleware stack |
| [testing.md](testing.md) | How to run the `tests/` suite and the contract checks |
| [openapi.yaml](../openapi.yaml) | Machine-readable API contract (validated by `npm run openapi:lint`) |

## Quick reference

- API base: `http://localhost:4000/api/v1` (configurable via `API_PREFIX`)
- Root health probe: `GET /health` (no auth)
- Auth: `POST /auth/login` → `{ accessToken, session }`; send as
  `Authorization: Bearer <token>` on every workforce route.
- Out-of-scope reads → `403 out_of_scope`; unknown routes → `404` with envelope.
- Scope model: `self` (staff) → `team` (team_lead) → `department` (manager) →
  `organization` (hr/owner) → `platform` (console).
