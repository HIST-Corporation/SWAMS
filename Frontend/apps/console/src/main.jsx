import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@swams/ui';
import { initI18n } from '@swams/i18n';
import { ConsoleRoot } from './ConsoleRoot.jsx';
import '@swams/design-tokens/css/tokens.css';
import '@swams/ui/styles/tailwind.css';

initI18n();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ConsoleRoot />
    </ThemeProvider>
  </StrictMode>,
);
