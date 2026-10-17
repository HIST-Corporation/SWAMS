import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from '@swams/i18n';
import { shouldUseMock, startMocking } from './mocks/index.js';
import './styles/fonts.css';
import '@swams/design-tokens/css/tokens.css';
import './styles/globals.css';
import App from './app/App.jsx';

// Restore the language choice (saved by the Topbar switch) before first render.
const storedLanguage = (() => {
  try {
    return window.localStorage.getItem('swams.language') || undefined;
  } catch {
    return undefined;
  }
})();
initI18n({ lng: storedLanguage });

/**
 * Mock-first boot (Section 5): MSW serves the OpenAPI contract until the real
 * API exists. `?mock=1` forces mocks on, `VITE_MOCK=0` forces them off.
 */
async function bootstrap() {
  if (shouldUseMock()) {
    try {
      await startMocking();
    } catch (error) {
      // Never let the mock layer keep the app from booting: the shell renders
      // its session-error state instead, with a retry.
      console.warn('MSW worker could not start; rendering without mocks.', error);
    }
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
