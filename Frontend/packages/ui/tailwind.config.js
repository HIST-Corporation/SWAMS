import tokensPreset from '@swams/design-tokens/tailwind-preset';

/** Tailwind for the component library + Storybook (consumes the tokens preset). */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,jsx}', './stories/**/*.{js,jsx}', './.storybook/**/*.{js,jsx}'],
  presets: [tokensPreset],
};
