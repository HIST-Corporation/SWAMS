import tokensPreset from '@swams/design-tokens/tailwind-preset';

/**
 * Tailwind for the marketing site (Section 13) — the same tokens preset the
 * app uses, so `packages/ui` primitives render identically here.
 * `packages/ui` must be scanned too: a utility that only a shared component
 * uses would otherwise never be emitted.
 */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
    '../../packages/ui/src/**/*.{js,jsx}',
  ],
  presets: [tokensPreset],
};
