# Frontend stack — chosen versions

**Last verified:** 2026-10-08 · Installed at latest stable majors per Section 5A, then verified
together. Renovate/Dependabot should open update PRs against these.

| Area                 | Tool                                                 | Version          | Notes                                                                              |
| -------------------- | ---------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| Runtime              | Node                                                 | v25.2.1          | engines `>=20.11`                                                                  |
| Package manager      | pnpm                                                 | 11.22.0          | `packageManager` pinned; lockfile committed                                        |
| Monorepo             | Turborepo                                            | 2.11.7           | build/test tasks, output caching                                                   |
| Language             | JavaScript (ESM)                                     | ES2023+          | **no `.ts` files** — enforced by `scripts/check-js-only.mjs` (ADR 0001)            |
| UI library           | React / React DOM                                    | 19.3.0           |                                                                                    |
| App build            | Vite                                                 | 8.3.3            | + `@vitejs/plugin-react` 6.1.2 (rolldown bundler)                                  |
| Routing              | React Router (data router)                           | 7.18.4           | lazy route modules                                                                 |
| Public site          | Next.js (static export)                              | 16.4.0           | `output: 'export'`, marketing only (ADR 0002)                                      |
| Styling              | Tailwind CSS                                         | 3.4.19           | + postcss 8.5.29, autoprefixer 10.6.1; `darkMode: ['class','[data-theme="dark"]']` |
| Tokens               | `@swams/design-tokens`                               | 0.1.0            | tokens.json → css + tailwind preset + rn-theme                                     |
| Components           | Radix Dropdown Menu                                  | 2.1.25           | cva 0.7.1 · clsx 2.1.1 · tailwind-merge 3.7.0                                      |
| Icons                | lucide-react                                         | 1.52.0           | only icon set (Section 9.7)                                                        |
| Fonts                | Fontsource Mukta                                     | 5.3.0            | self-hosted, Latin + Devanagari, `font-display: swap`                              |
| Server state         | TanStack Query                                       | 5.104.1          |                                                                                    |
| HTTP                 | axios                                                | 1.20.0           | inside `@swams/api-client` (refresh + request IDs)                                 |
| Forms/validation     | Zod                                                  | 4.6.5            | schemas in `@swams/validation`                                                     |
| i18n                 | i18next / react-i18next                              | 26.4.2 / 17.0.16 | en + ne catalogs, key-parity test                                                  |
| Mocking              | MSW                                                  | 3.0.2            | browser worker + `msw/node` in tests                                               |
| Unit/component tests | Vitest                                               | 5.0.3            | + jsdom 30.1.2, Testing Library react 16.3.3 / jest-dom 7.0.1 / user-event 14.6.7  |
| E2E                  | Playwright                                           | 1.63.0           | desktop 1280 + mobile 360 projects                                                 |
| Component workshop   | Storybook                                            | 10.6.1           | react-vite framework + addon-a11y                                                  |
| Lint/format          | ESLint                                               | 9.39.5           | flat config + react 7.37.5 + react-hooks 7.1.1 + jsx-a11y 6.10.2 + prettier 3.9.9  |
| Hooks/commits        | Husky 9.1.7 · lint-staged 17.6.0 · Commitlint 21.2.3 |                  | conventional commits                                                               |
| Structure checks     | dependency-cruiser 18.5.0 · knip 6.40.0              |                  | graph rules + dead code                                                            |
| CI                   | GitHub Actions                                       | —                | lint → test → build → storybook → Playwright (`.github/workflows/ci.yml`)          |

## Deliberate deviations (verified, with reasons)

1. **ESLint 9, not 10.** `eslint-plugin-react@7.37.5` (latest) crashes on ESLint 10
   (`context.getFilename` removed). Revisit when the plugin ships ESLint 10 support.
2. **Tailwind 3.4, not v4.** The binding config in Section 8.3 is
   `darkMode: ['class','[data-theme="dark"]']` + a JS preset (`tailwind-preset.js`) — that is the
   v3 contract. Moving to v4's CSS-first config is an open follow-up (recorded in PROGRESS.md).
3. **Not installed yet (declared in 5A but no code needs them today):** XState (build order 3),
   Zustand (first store lands with the shell), Socket.IO (realtime), Framer Motion / `motion`
   (punch confirmation), Recharts, TanStack Table/Virtual, dnd-kit, MapLibre/Leaflet, DOMPurify,
   Sentry, vite-plugin-pwa, next-intl, Lighthouse CI, Docker. Each lands with its slice.
4. **Brand color / palette** is the Section 8.2 proposal pending owner confirmation
   (Open Decision 1) — see `docs/design/token-diff.md`.

## RN-safe? (Section 11)

`design-tokens`, `domain`, `validation`, `permissions`, `i18n`, `api-client`, `config` are
DOM-free. `ui`, `api-client` axios instance config and all `apps/*` are web-only by design.
