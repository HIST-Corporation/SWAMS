import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider } from '@swams/ui';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '../lib/queryClient.js';
import { persistTheme } from '../lib/persistPreferences.js';
import { SessionProvider } from '../features/auth/SessionProvider.jsx';
import { PwaUpdater } from '../shell/PwaUpdater.jsx';
import { router } from './router.jsx';

/**
 * App shell providers (Section 5):
 *  - TanStack Query owns server data
 *  - ThemeProvider owns the Light/Dark/System preference (localStorage now,
 *    PATCH /me/preferences once signed in)
 *  - SessionProvider owns the session machine (7.3) and primes the query
 *  - PwaUpdater owns service-worker registration + update/install toasts (§11.8)
 *  - React Router owns the URL (filters, tabs, selected ids)
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider onPersist={persistTheme}>
        <ToastProvider>
          <SessionProvider>
            <RouterProvider router={router} />
          </SessionProvider>
          <PwaUpdater />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
