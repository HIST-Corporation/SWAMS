import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * One Vitest run for the whole workspace (Section 14).
 * Component tests opt into jsdom with a `// @vitest-environment jsdom` docblock.
 */
export default defineConfig({
  resolve: {
    // vite-plugin-pwa's virtual module only exists inside a Vite build; the
    // alias keeps the import resolvable in tests, where the PWA specs mock it.
    alias: {
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./tests/pwa-register.stub.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/*/src/**/*.test.{js,jsx}',
      'apps/*/src/**/*.test.{js,jsx}',
      // Marketing/console keep their sources out of src/ (Section 13 layout).
      'apps/*/components/**/*.test.{js,jsx}',
      'apps/*/app/**/*.test.{js,jsx}',
      'tests/**/*.test.{js,jsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'apps/*/e2e/**'],
    setupFiles: ['./tests/setup.js'],
    restoreMocks: true,
  },
});
