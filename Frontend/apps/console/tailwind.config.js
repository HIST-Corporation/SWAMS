import tokensPreset from '@swams/design-tokens/tailwind-preset';

/**
 * Tailwind for the console app (same tokens as the main app). `packages/ui` is
 * scanned as well, so a utility that only a shared component uses still emits.
 */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}', '../../packages/ui/src/**/*.{js,jsx}'],
  presets: [tokensPreset],
  theme: {
    extend: {
      maxWidth: {
        reading: 'var(--max-width-reading)',
      },
    },
  },
};
