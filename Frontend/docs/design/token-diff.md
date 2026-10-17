# Token diff — prototype vs Section 8.2 vs shipped tokens

**Last verified:** 2026-10-08 · Sources: `design-prototype/SWAMS_Unified.html` (read-only copy),
`design-prototype/SWAMS_Landing.html`, Section 8.2 of `docs/FRONTEND_PROMPT.md`, shipped
`packages/design-tokens/tokens.json`.

Legend: **FACT** = read from a file · **ASSUMPTION** = inferred · **OPINION** = our call (needs
owner confirmation where marked ⚠️).

## 1. What the prototypes actually define (FACT)

`SWAMS_Unified.html` ships **two design systems in one file**: an HR shell (`.sidebar`, `--bg`,
`--surface`, `--text*`) and a compact staff shell (`--sw`, `--sur`, `--tx*` aliases), plus a
binary light override on `html[data-theme="light"]`. `SWAMS_Landing.html` defines a third, newer
set. Fonts are **DM Sans + Syne** (Google Fonts, remote), icons are **Font Awesome** (both are
replaced per Section 5A: Mukta + lucide).

| Prototype token (dark default)                                     | Value                                                       | Section 8.2 / shipped token                            | Shipped value (dark)                                             | Verdict                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `--bg`                                                             | `#0d0f14` (landing `#0a0c11`)                               | `--bg`                                                 | `#0E1118`                                                        | replaced (8.2 wins, per prompt)                                      |
| `--bg2` / `--bg3` / `--bg4`                                        | `#13161d` / `#1a1e28` / `#222736`                           | `--surface` / `--surface-raised` / `--surface-sunken`  | `#161A24` / `#1D2230` / `#0A0D13`                                | renamed + replaced                                                   |
| `--surface` / `--surface2`                                         | `#1e2230` / `#252a3a`                                       | (folded into surface scale)                            | —                                                                | superseded                                                           |
| `--border` / `--border2`                                           | `rgba(255,255,255,.07/.12)`                                 | `--border`                                             | `#2A3042`                                                        | replaced (solid hex chosen for AA on borders)                        |
| `--text` / `--text2` / `--text3`                                   | `#f0f2f8` / `#9ba3bc` / `#5a6380`                           | `--text` / `--text-muted` / `--text-faint`             | `#ECEEF6` / `#A3AAC2` / `#858DAA`*                               | renamed; faint **adjusted for contrast**                             |
| `--accent` / `--accent2`                                           | `#4f6ef7` / `#6c8bff`                                       | `--primary` (+ soft)                                   | `#7C93FF` / `#1B2142`                                            | replaced; prototype accent is closer to our `--chart-indigo #4F6EF7` |
| `--green` / `--amber` / `--red` / `--cyan` / `--pink` / `--purple` | `#22c55e` `#f59e0b` `#ef4444` `#06b6d4` `#ec4899` `#a855f7` | `--success/warning/danger/info/*` (+ chip rose/violet) | 8.2 palette                                                      | replaced                                                             |
| `--lime` / `--lime-text`                                           | `#2E5CFF` (actually blue!) / `#fff`                         | —                                                      | —                                                                | dropped: **name lies**, and 8.2 bans lime/acid green                 |
| `--lavender*` / `--glow-accent` / `--ov1..5`                       | tints, glow, overlays                                       | —                                                      | partly `--accent-soft`, `--overlay`                              | dropped as decoration (Section 9.3: no glow blobs)                   |
| `--radius` / `--radius-sm` / `--radius-lg`                         | `12 / 8 / 16` (landing `16/10/24`)                          | role radii                                             | `input 8 · button 10 · card 14 · hero 20 · sheet 24 · pill 9999` | replaced: **role-based**, not size-based (9.2)                       |
| `--sidebar-w` / `--sw`                                             | `240px` / `260px`                                           | —                                                      | —                                                                | layout value, not a design token                                     |
| `--shadow-sm/md/lg`                                                | light-only overrides                                        | `--shadow-1/2`                                         | 2 levels per theme                                               | replaced (Section 8.2: exactly two levels)                           |
| `#theme-toggle` (binary moon/sun)                                  | dark ⇄ light, not persisted                                 | Light / Dark / **System**                              | `ThemeProvider`                                                  | replaced (Section 8.3)                                               |

## 2. Deviations from Section 8.2 (with proof)

The prompt says: _"Verify all text pairs ≥ 4.5:1 in **both** themes before accepting."_
We did — with `packages/design-tokens/src/contrast.js` and `src/tokens.test.js` (WCAG 2.x
relative-luminance math, 71 assertions). Two required corrections:

| #   | Token                                         | 8.2 value                                                         | Shipped value                                                                                                                  | Why                                                                                                                                                          |
| --- | --------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `--text-faint` light / dark                   | `#7A8099` / `#6F7794`                                             | `#63697F` / `#858DAA`                                                                                                          | 8.2 values score **3.59:1** (light bg) and **4.26:1** (dark bg) — below the spec's own 4.5 rule.                                                             |
| 2   | semantic colors on their own soft backgrounds | e.g. `--success #1F8F5B` on `--success-soft #DDF3E8` = **3.52:1** | added `--success-text`, `--warning-text`, `--danger-text`, `--info-text`, `--accent-text` (darkened for light theme, same hue) | status chips and inline alerts put these pairs on screen constantly; 8.2 as written fails AA there. Base colors kept for borders/icons/large text (≥3:1 UI). |

Everything else in 8.2 is shipped **as written** (bg, surfaces, border, text, text-muted,
primary/soft/on-primary, accent/soft, success/warning/danger/info + softs).

## 3. Values we had to invent (OPINION, ⚠️ owner confirmation)

1. **Icon-chip pairs** (8.2 names the five hues and their category mapping but not hexes):
   indigo/marigold/teal/rose/violet soft-bg + strong-fg per theme — all verified ≥4.5:1 and
   ≥4.5:1 on `--surface`.
2. **Elevation recipes** (8.2 describes behavior, not values): light = two soft tinted shadows;
   dark = `0 0 0 1px` border + a very soft drop — no heavy dark shadows.
3. **Selection + overlay** (`--selection-bg/text`, `--overlay`) — required by 8.3 (selection
   color) and modals; values chosen to match the palette.
4. **Type scale names** (12/14/16/18/22/28/36/48 → xs…3xl) and `max-width-reading: 70ch`.
5. **Motion values are exactly 8.2's** (120/200/320 ms, `cubic-bezier(.2,.8,.2,1)`); z-index
   ladder exactly 8.2's.

## 4. Prototype assets intentionally NOT ported

Remote Google Fonts (→ self-hosted Fontsource Mukta) · Font Awesome (→ lucide) · radial gradient
backgrounds and float-orbs on login (→ no gradient washes, 9.3) · `Syne` display headings (→ one
family, 9.4) · glow shadows · hard-coded `#fff` avatars (→ initials on chip tints, 9.7).

**Open decisions affected:** 1 (brand color), 2 (typeface after dual-script rendering test),
11 (illustration style).
