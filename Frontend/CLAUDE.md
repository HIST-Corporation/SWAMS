# CLAUDE.md

**Read `docs/FRONTEND_PROMPT.md` before any frontend task.** It is the binding contract:
role, architecture, design dials, anti-mess rules, definition of done.

## Commands

| Command                     | What it does                                               |
| --------------------------- | ---------------------------------------------------------- |
| `pnpm install`              | install workspace deps (lockfile committed)                |
| `pnpm lint`                 | ESLint flat config + JS-only guard + import-boundary guard |
| `pnpm test`                 | Vitest across all packages/apps (unit + component)         |
| `pnpm build`                | Turborepo build of every app/package                       |
| `pnpm storybook:build`      | build Storybook for `packages/ui`                          |
| `pnpm e2e`                  | Playwright smoke (apps/web)                                |
| `pnpm gen:feature <name>`   | scaffold a feature folder (Section 6.1 template)           |
| `pnpm gen:component <Name>` | scaffold a ui component + story + test                     |
| `pnpm check:cruiser`        | dependency-cruiser graph rules                             |
| `pnpm knip`                 | dead-code check                                            |

## Non-negotiables (short form)

- **JavaScript only.** No `.ts` files, no TS build step (ADR 0001).
- **Tokens, not literals.** No raw colors / px sizes / user-visible strings in feature code.
- **i18n everywhere.** English + Nepali; BS/AD dates through `packages/i18n`.
- **Both themes, three widths (360 / 768 / 1280).** Nothing is "done" until checked in light _and_ dark.
- **States before happy path:** loading, empty, error, denied, offline.
- **Boundaries:** features import only another feature's `index.js`; packages never import apps;
  apps never import each other; shared packages stay DOM-free.
- **No fake integrations.** Mocks are labeled; never present a mock as production behavior.
- **File ≤ 250 lines, component ≤ 180 lines.** Split before exceeding.

## Where things live

`apps/web` (Vite PWA) · `apps/marketing` (Next static export) · `apps/console` (platform admin) ·
`packages/design-tokens|ui|i18n|domain|validation|permissions|api-client|config` ·
`docs/` (design, frontend, adr, api-contract) · `design-prototype/` (**read-only** copies of the
two prototype HTML files — never edit them).

## Report format

Every task ends with: Analysis (FACT / ASSUMPTION / OPINION) · Design plan · Changes (files) ·
States covered · Themes/widths checked · i18n and BS/AD · Accessibility · Tests · Docs ·
Evidence · Open decisions · Next step.
