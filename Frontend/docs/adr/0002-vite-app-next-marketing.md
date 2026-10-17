# ADR 0002 — Vite for the app, Next.js static export for marketing

**Status:** accepted · **Date:** 2026-10-08 · **Author:** frontend team

## Context

`apps/web` is a daily-use dashboard-class SPA (PWA, offline queue, code-split routes, MSW in
dev). `apps/marketing` needs SEO: per-page metadata, hreflang, sitemap, structured data, SSG in
English and Nepali. Section 5A scopes Next.js to marketing only; Open Decision 3 asks whether to
use Next for both.

## Decision

- `apps/web`: **Vite** (8.x) + React Router data router with lazy routes, `vite-plugin-pwa` when
  the offline slice lands.
- `apps/marketing`: **Next.js** with `output: 'export'` (pure static export — no SSR, no
  middleware, deployable to any CDN), MDX content per language, `next-intl` when bilingual content
  lands (build order 9).
- `apps/console`: Vite, same tokens and theme system as the app.

## Consequences

- The app keeps a minimal, fast dev loop; the marketing site keeps real SEO primitives.
- Static export means no Node server to host or secure.
  − Two build toolchains to maintain; shared code must stay toolchain-agnostic (it does — packages
  are plain ESM source).
  − Next for both would remove the split but forces SSR/ISR trade-offs on the app (Open Decision 3,
  not chosen).

## Alternatives considered

Next.js for everything (rejected for now); Astro marketing (rejected: prompt names Next);
Capacitor/SPA-only marketing (rejected: SEO).
