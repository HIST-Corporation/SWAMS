import tokensPreset from '@swams/design-tokens/tailwind-preset';

/**
 * Tailwind for apps/web — utilities read CSS variables from the tokens package.
 * `max-w-reading` maps the tokens package' reading measure (8.2 type rule);
 * pages already use the class, so it must actually generate CSS.
 *
 * `packages/ui` is scanned too: the shared patterns/primitives ARE app UI (§8.7),
 * and a utility used only inside one of them would otherwise never be emitted.
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
