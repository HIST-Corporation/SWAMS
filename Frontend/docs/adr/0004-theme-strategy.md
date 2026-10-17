# ADR 0004 — Theme strategy: CSS variables + data-theme, three-way preference

**Status:** accepted · **Date:** 2026-10-08 · **Author:** frontend team

## Context

Section 8.3 requires light **and** dark as first-class designed themes, a Light/Dark/System
choice, no flash of the wrong theme before first paint, persistence to localStorage _and_
`PATCH /me/preferences`, multi-tab sync, OS changes while on System, theme-aware charts/skeletons/
selection/focus, and the same behavior on the marketing site and console.

## Decision

1. **Tokens are the only color source.** `packages/design-tokens/tokens.json` → generated
   `css/tokens.css`: light values on `:root`, dark values on `[data-theme="dark"]` (and a
   re-asserted light block on `[data-theme="light"]` so subtrees can be scoped, e.g. Storybook
   side-by-side reviews). A test fails if the generated CSS drifts from `tokens.json`.
2. **Attribute, not class:** `data-theme="light|dark"` on `<html>`; Tailwind
   `darkMode: ['class', '[data-theme="dark"]']`; `<meta name="color-scheme" content="light dark">`;
   `color-scheme` and `theme-color` updated with the theme.
3. **Pre-paint inline script** in every entry HTML (web, console, marketing) before any CSS reads
   `localStorage['swams.theme']` (default `system` + `matchMedia`) and sets the attribute — this
   is the only inline script allowed by CSP.
4. **`ThemeProvider` (packages/ui)** owns the runtime: applies the resolved theme, persists
   immediately to localStorage, calls an `onPersist` callback (the app wires
   `PATCH /me/preferences`), listens to `storage` (multi-tab) and `matchMedia` change (OS).
   `ThemeToggle` renders Light/Dark/System as a Radix radio menu with i18n labels.
5. **Dark is designed, not inverted:** separate dark values in tokens, desaturated status colors,
   border-based elevation, and every text pair verified ≥ 4.5:1 in both themes by tests.

## Consequences

- One swap point for every surface (app, marketing, console, future RN via `rn-theme.js`).
- No FOUC; preference survives reloads, tabs and devices.
- Visual regression can snapshot both themes at 360/768/1280.
  − Storybook/React must never hardcode a hex — lint blocks it in feature code.

## Alternatives considered

next-themes (marketing only, splits the model); CSS classes only (fails scoped theming in
stories); JS-injected styles pre-paint (more work, same result).
