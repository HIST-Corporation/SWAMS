/** Storybook config (Section 6: one story per state, both themes). */
const config = {
  stories: ['../src/**/*.stories.@(js,jsx)', '../stories/**/*.stories.@(js,jsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
