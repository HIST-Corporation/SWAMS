import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * App build (Section 6) + PWA shell (Section 11 rule 8).
 *
 * The service worker is production-only (`devOptions.enabled: false`): in dev
 * MSW owns the fetch layer and a second worker only creates the controller
 * flakiness already documented in `src/mocks/index.js`. Updates use
 * `registerType: 'prompt'` — a new version waits behind the update toast
 * (`shell/PwaUpdater.jsx`) and never swaps under a user mid-punch.
 *
 * Caching policy: the app shell (js/css/html/fonts/icons) is precached so the
 * app opens offline; `/api/**` and MSW's own worker are never cached — REST is
 * truth (§5) and the offline path is the punch queue (§7.2), not stale reads.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Registration happens in `PwaUpdater` via `virtual:pwa-register/react`
      // so the update/install toasts live in one component.
      injectRegister: false,
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'SWAMS — Smart workflow and attendance',
        short_name: 'SWAMS',
        description: "Attendance, leave and work for Nepal's SMEs — online or offline.",
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F4F5F9',
        // Static default; the in-page <meta theme-color> follows the active
        // theme via the pre-paint script in index.html.
        theme_color: '#F4F5F9',
        lang: 'en',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: '/icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // MSW's worker ships in public/ and must stay network-fetched, or a
        // stale mock worker would outlive the mocks it was built with.
        globIgnores: ['**/mockServiceWorker.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/mockServiceWorker\.js$/],
        cleanupOutdatedCaches: true,
        // Prompt-driven updates: never skipWaiting behind the user's back.
        clientsClaim: false,
        skipWaiting: false,
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Local dev against the real Express API (Backend/src/server.js :4000).
      // Same-origin proxy keeps the httpOnly refresh cookie working without
      // CORS workarounds. Remove this block to go back to MSW mock-first.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 400,
  },
});
