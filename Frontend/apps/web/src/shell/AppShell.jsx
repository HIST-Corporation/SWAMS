import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';
import { useSession } from '../hooks/useSession.js';
import { mobileTabs, visibleGroups } from '../app/nav-access.js';
import { NAV_ITEMS } from '../app/nav.config.js';
import { BottomNav } from './BottomNav.jsx';
import { AppCommandPalette } from './CommandPalette.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/**
 * One AppShell for every role (Section 12 step 6: no duplicated HR/Staff shells —
 * the nav config decides what renders). Designs its own loading and error states
 * before any page mounts (Section 8.1 rule 4).
 */
export function AppShell() {
  const { t } = useTranslation();
  const { principal, user, org, entitlements, isLoading, error, refetch } = useSession();
  const offline = useOfflineStatus();

  if (isLoading) return <ShellSkeleton />;
  if (error || !principal) return <SessionError error={error} onRetry={refetch} />;

  const groups = visibleGroups(NAV_ITEMS, principal, entitlements);
  const tabs = mobileTabs(NAV_ITEMS, principal, entitlements);

  return (
    <div className="bg-bg text-text flex min-h-dvh">
      <a
        href="#main-content"
        className="focus:bg-surface focus:text-text sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-input focus:border focus:border-border focus:px-4 focus:py-2"
      >
        {t('nav.skipToContent', { ns: 'nav' })}
      </a>

      <Sidebar groups={groups} user={user} org={org} role={principal.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} org={org} />

        {offline ? (
          <div
            role="status"
            className="bg-warning-soft text-warning-text border-b border-border px-4 py-2 text-sm md:px-6"
          >
            {t('state.offline')}
          </div>
        ) : null}

        {/* `pb-24` clears the bottom rail, which now runs to 1023px, so the
            padding follows the rail's breakpoint rather than `md`. */}
        <main id="main-content" className="flex-1 px-4 pt-2 pb-24 md:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </main>
      </div>

      <AppCommandPalette />
      <BottomNav items={tabs} />
    </div>
  );
}

/** Loading state: skeleton shell, not a spinner (Section 8.11). */
function ShellSkeleton() {
  return (
    <div className="bg-bg flex min-h-dvh" aria-busy="true">
      <div className="bg-nav-bg border-nav-border hidden w-60 shrink-0 border-r p-4 lg:block">
        <div className="bg-nav-border mb-6 h-8 w-24 animate-pulse rounded-input" />
        <div className="bg-nav-border mb-6 h-10 animate-pulse rounded-input" />
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="bg-nav-border mb-3 h-8 animate-pulse rounded-input"
            style={{ width: `${70 + (row % 3) * 10}%` }}
          />
        ))}
      </div>
      <div className="flex-1">
        <div className="h-12" />
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="h-40 animate-pulse rounded-hero bg-surface md:col-span-2" />
          <div className="h-40 animate-pulse rounded-card bg-surface" />
        </div>
      </div>
    </div>
  );
}

/** Error state with request ID under Details and a retry (Section 10). */
function SessionError({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-dvh max-w-reading flex-col justify-center gap-4 p-6"
    >
      <h1 className="text-xl">{t('state.error')}</h1>
      <p className="text-text-muted">{error?.message ?? t('state.offline')}</p>
      {error?.requestId ? (
        <details className="text-text-faint text-sm">
          <summary className="cursor-pointer">Details</summary>
          <p className="tabular">Request ID: {error.requestId}</p>
        </details>
      ) : null}
      <div>
        <Button onClick={() => onRetry?.()}>{t('actions.retry')}</Button>
      </div>
    </main>
  );
}

/** Online/offline banner state (Section 7.2 surface). */
function useOfflineStatus() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return offline;
}
