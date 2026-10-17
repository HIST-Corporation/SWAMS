# ADR 0001 — JavaScript only (no TypeScript)

**Status:** accepted · **Date:** 2026-10-08 · **Author:** frontend team

## Context

The original tech-stack PDF specifies TypeScript; every later decision document (the unified
prompt, Volume 01, and the FRONTEND_PROMPT we build against) chooses JavaScript. Section 5A
records this as a deliberate **change** and adds JSDoc + `// @ts-check` in shared packages as the
compromise.

## Decision

All application and package code is JavaScript (ESM, ES2023+). No `.ts`/`.tsx` files and no TS
build step, anywhere in the monorepo. Quality comes from:

- JSDoc types on exported functions and all of `packages/*`, with `// @ts-check` in editors;
- ESLint (react, react-hooks, jsx-a11y, boundaries, no-restricted-syntax);
- Vitest unit/component tests and Playwright E2E;
- `scripts/check-js-only.mjs`, which fails `pnpm lint` if a TypeScript file appears.

## Consequences

- One toolchain, faster cold builds, contributors need no TS tooling.
  − No compile-time proof of interface contracts across packages; tests must carry that weight.
  − Editor IntelliSense is only as good as the JSDoc we write.

## Alternatives considered

TypeScript end-to-end (rejected: contradicts the binding prompt); JSDoc without `@ts-check`
(rejected: weaker editor feedback).
