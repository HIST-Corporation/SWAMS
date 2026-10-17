# SWAMS — Design System

**Date:** 2026-10-13 · **Source of truth:** `packages/design-tokens/css/tokens.css` (+ the Tailwind preset `@swams/design-tokens/tailwind-preset`) and the components in `packages/ui`. This document records the system as implemented; it adds no new visual direction this session (the direction was set and shipped earlier — see `design-research.md`).

## 1. Principles

- **Tokens, not literals.** No raw colors, px values, or user-visible strings in feature code. Every value is a CSS variable exposed through the Tailwind preset. Enforced by convention plus the eslint `no-raw-*` guards.
- **Calm enterprise SaaS.** Light-first warm-neutral canvas, white raised surfaces, deep-ink text, restrained indigo primary, warm marigold support hue. No gradients/glow/glass as defaults, no decorative bento grids inside the app.
- **Meaning never travels by color alone** — every status pairs a color with a word and/or an icon (Badge tones, worded legends, `sr-only` sentences).
- **States before happy path:** loading (skeletons), empty (reason + next action), error (message + request id + retry), denied (no restricted data shown), offline (queued chips).

## 2. Token families (packages/design-tokens)

| Family                                      | Examples (CSS variables)                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Color — surfaces                            | `--bg`, `--surface`, `--surface-raised`, `--surface-sunken` (light + dark pairs, `[data-theme]`-switched)           |
| Color — text                                | `--text`, `--text-muted`, `--text-faint`, `--brand-text`, `--on-primary`                                            |
| Brand & primary                             | `--primary`, `--primary-soft`, `--brand`                                                                            |
| Semantic status                             | `--success(-soft/-text)`, `--warning…`, `--danger…`, `--info…`, plus violet/rose chart hues                         |
| Border & focus                              | `--border`, `--border-strong`, focus rings via `--primary` (2px, 2px offset)                                        |
| Type                                        | `--font-ui`, `--font-display`, `--line-height-body`, tabular numerals class `tabular`                               |
| Space / radius / shadow / motion / layering | `--max-width-reading`, `rounded-card` / `rounded-input` / `rounded-pill`, `shadow-1`, `duration-feedback`, z-layers |

Theme resolution: `ThemeProvider` (packages/ui) — Light / Dark / System, persisted under `swams.theme`, applied via `data-theme` on `<html>`; an inline script in each app's `index.html` prevents a flash. `apps/console` now shares the identical setup.

## 3. Component inventory (packages/ui)

- **Primitives:** Button (variants primary/secondary/quiet, sizes, loading/disabled), IconButton (always labelled), Input, Textarea, Checkbox, Switch, Badge (neutral/primary/success/warning/danger/info/violet/rose), Avatar (sizes + hues), Skeleton (inline/block).
- **Patterns:** FormField (label + hint + error wiring), Card / CardTitle / PageHeader, EmptyState, ErrorState (message + requestId + retry), StatTile (icon chip + tabular value + label + hint), PreviewNotice (honest-mock banner; `badgeKey`/`bodyKey`), Stepper, CommandPalette.
- **Feedback:** Toast (provider + hook).
- **Theme:** ThemeProvider / useTheme / ThemeToggle (three-way).
- **Console-specific:** the console reuses all of the above; its only bespoke visual element is `FixtureNotice` (PreviewNotice's visual language with `console` namespace copy) — deliberate, because the shared pattern reads from the `common` namespace.

## 4. Six-role visual behaviour (this session's additions)

- **Login persona cards** (`LoginPersonaPicker`): 2-column native-radio grid, identical styling for management (Executive/HR/Dept. Manager/Team Lead) and staff (Frontend/Backend/QA/DevOps) personas. Selected card = primary border + primary/10 fill + primary text; focus-visible ring.
- **Dashboard compositions** (`dashboardView`): org / team / personal — same widgets, different composition; no new component styles.
- **RolesMatrix** (settings, read-only): renders one column per canonical role from `ROLES`/`ROLE_BUNDLES`; a new role automatically appears (needs only a `settings.json` `roles.role.<role>` label in en + ne).

## 5. Theming & i18n guarantees

- Both themes are first-class; the E2E contrast audit (Playwright, `apps/web/e2e`) checks product pages in light and dark at 360/768/1280.
- All user-visible strings live in `packages/i18n/locales/{en,ne}`; the parity test fails on any key present in one locale only — now including the `console` namespace (16 namespaces total).
- Layouts tolerate longer (Nepali) translations: persona cards and console nav wrap/scroll rather than clip.

## 6. What was deliberately NOT changed

No token renames, no palette rewrite, no new component variants. The existing system passed its own tests and e2e audit; this session extended it (team_lead labels, console namespace) rather than replacing it.
