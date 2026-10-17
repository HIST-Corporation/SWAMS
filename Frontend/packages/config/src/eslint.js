import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

/**
 * Flat ESLint config for the SWAMS frontend monorepo (Section 10, Quality).
 * Enforces Section 6.2 anti-mess rules that can be expressed as lints:
 *  - no raw hex colors in feature code (tokens only)
 *  - no hard-coded user-visible strings in feature code (i18n keys only)
 *  - a11y correctness (jsx-a11y) and hooks rules
 * Workspace/import boundaries are policed by scripts/check-boundaries.mjs
 * and .dependency-cruiser.cjs.
 */

const NO_RAW_COLOR = {
  selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message: 'Raw colors are forbidden in feature code — use a design token (Section 6.2 rule 6).',
};

const NO_RAW_STRING = {
  selector: 'JSXText[value=/\\S/]',
  message: 'Raw user-visible strings are forbidden — use an i18n key (Section 6.2 rule 6).',
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/public/**',
      'design-prototype/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      'react/prop-types': 'off',
    },
  },
  // Shared packages: JSDoc + @ts-check is expected, DOM access is banned (Section 11 rule 1).
  {
    files: ['packages/{domain,validation,permissions,i18n,api-client,design-tokens}/**/*.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Shared packages must stay DOM-free (Section 11).' },
        { name: 'document', message: 'Shared packages must stay DOM-free (Section 11).' },
        { name: 'localStorage', message: 'Use the storage adapter interface (Section 11).' },
        { name: 'fetch', message: 'Use packages/api-client (Section 5).' },
      ],
      'no-restricted-syntax': ['error', NO_RAW_COLOR],
    },
  },
  // Feature code: tokens + i18n only (Section 6.2 rule 6).
  {
    files: ['apps/*/src/features/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error', NO_RAW_COLOR, NO_RAW_STRING],
    },
  },
  // Tests may use explicit literals and console output.
  {
    files: ['**/__tests__/**', '**/*.test.{js,jsx}', '**/*.stories.{js,jsx}', 'tests/**'],
    rules: {
      'no-restricted-syntax': 'off',
      'no-restricted-globals': 'off',
      'no-console': 'off',
    },
  },
  // Generated artifacts and Node-side tooling may contain raw values / console output.
  {
    files: [
      'scripts/**/*.mjs',
      '**/scripts/**/*.mjs',
      'packages/design-tokens/rn-theme.js',
      '*.config.{js,mjs,cjs}',
      '.storybook/**',
    ],
    rules: { 'no-console': 'off', 'no-restricted-syntax': 'off', 'no-restricted-globals': 'off' },
  },
  prettier,
];
