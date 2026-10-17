import { useEffect } from 'react';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
import '@swams/design-tokens/css/tokens.css';
import '../src/styles/tailwind.css';
import { initI18n } from '@swams/i18n';

initI18n();

export const globalTypes = {
  theme: {
    description: 'Color theme (Section 8.3)',
    defaultValue: 'system',
    toolbar: {
      title: 'Theme',
      icon: 'mirror',
      items: ['light', 'dark', 'system'],
      dynamicTitle: true,
    },
  },
};

function applyStoryTheme(theme) {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
  const dark = theme === 'dark' || (theme !== 'light' && prefersDark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export const decorators = [
  (Story, context) => {
    useEffect(() => {
      applyStoryTheme(context.globals.theme ?? 'system');
    }, [context.globals.theme]);
    return <Story />;
  },
];

export const parameters = {
  layout: 'padded',
  controls: { expanded: true },
  options: { storySort: { order: ['Foundations', 'Primitives'] } },
};
