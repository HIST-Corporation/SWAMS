/**
 * Test stand-in for vite-plugin-pwa's `virtual:pwa-register/react`: the real
 * module only exists inside a Vite build, so `vitest.config.js` aliases it
 * here. Specs that need update behaviour mock it with `vi.mock`.
 */
export function useRegisterSW() {
  return {
    offlineReady: false,
    needRefresh: false,
    updateServiceWorker: () => {},
  };
}
