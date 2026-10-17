# @swams/config

Shared tooling configuration (Section 6).

| Config             | Home                                                                                   | Why                                                    |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ESLint (flat)      | `src/eslint.js` (root `eslint.config.js` re-exports)                                   | one rule set for every workspace                       |
| Prettier           | root `.prettierrc.json` + `.prettierignore`                                            | Prettier resolves config from the file being formatted |
| Tailwind           | `@swams/design-tokens/tailwind-preset.js`, consumed by each app's `tailwind.config.js` | tokens are the source of truth, not this package       |
| Vitest             | root `vitest.config.js` + `tests/setup.js`                                             | one test run for the workspace (Section 14)            |
| Vite               | per app (`apps/*/vite.config.js`)                                                      | apps differ (PWA, ports, chunking)                     |
| dependency-cruiser | root `.dependency-cruiser.cjs`                                                         | graph rules need the whole workspace                   |
| knip               | root `knip.json`                                                                       | dead-code detection across workspaces                  |

`// @ts-check` + JSDoc apply to this package's sources (Section 5A).
