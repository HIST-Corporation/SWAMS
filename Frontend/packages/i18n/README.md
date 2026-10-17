# @swams/i18n

English + Nepali catalogs, the i18next bootstrap, and pure formatters.

- **Namespaces per feature:** `locales/{en,ne}/<feature>.json`. A test enforces en/ne key parity.
- **No hard-coded strings:** feature code passes keys through `useTranslation()`; ESLint blocks
  raw JSX text in `apps/*/src/features/**`.
- **Formatters:** `formatMoney` (NPR + lakh/crore grouping), `formatDuration`, `formatClock`
  (Nepal UTC+05:45), `toDevanagariDigits`.
- **BS/AD:** `formatDateAd` renders the AD half only. BS dates come from `packages/domain` once a
  verified Bikram Sambat converter is adopted (Open Decision 12 / contract request) — this package
  never invents a BS date.
- **Nepali copy** is a first draft; a Nepali-speaking reviewer signs off before release
  (Section 8.8) and maintains the glossary in `docs/design/content-style-guide.md`.
- **RN-safe?** Yes — no `window`, `document` or CSS anywhere in this package.
