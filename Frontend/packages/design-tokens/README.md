# @swams/design-tokens

Single source of truth for the SWAMS visual language (Section 8.2).

```
tokens.json  ──build──►  css/tokens.css   (light on :root, dark on [data-theme="dark"])
             ──build──►  rn-theme.js      (same sets for the future Expo skin)
             ──export─►  tailwind-preset.js
```

- **Edit `tokens.json` only**, then `pnpm --filter @swams/design-tokens build`.
  A test fails if the generated files drift from `tokens.json`.
- **Contrast:** every text pair is asserted at `>= 4.5:1` in _both_ themes
  (`src/tokens.test.js`). Two deviations from the spec's proposed values are recorded in
  `docs/design/token-diff.md` (`textFaint`, and the new `*Text` variants for semantic colors).
- **Theme contract:** apps render light by default; `data-theme="dark"` on any ancestor swaps
  that subtree. The pre-paint script in `apps/web/index.html` sets it before first paint.
- **RN-safe?** Yes — `tokens.json`, `rn-theme.js` and `src/contrast.js` are DOM-free plain
  JavaScript; `css/tokens.css` is web-only.

Open decisions: brand color (1), typeface after dual-script rendering test (2) — see
`docs/FRONTEND_PROMPT.md` Section 19.
