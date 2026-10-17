import { useSession } from '../hooks/useSession.js';
import { navState } from './nav-access.js';
import { NoAccessPage } from '../shell/pages/NoAccessPage.jsx';

/**
 * Route guard (Section 4.1): auth → org → permission → entitlement.
 * The session/org half lands with auth (build order 2); permission and
 * entitlement are enforced now. All states render inline (no redirects, so a
 * failing session can never loop), and denial renders a designed page — never blank.
 *
 * @param {{ item: object, children: React.ReactNode }} props `item` is a nav
 *   config entry whose `requires` block drives the guard.
 */
export function RequirePermission({ item, children }) {
  const { principal, entitlements, isLoading, error } = useSession();

  if (isLoading) {
    return (
      <div className="p-6 text-text-muted" role="status">
        Loading…
      </div>
    );
  }

  if (error || !principal) {
    return (
      <div className="p-6" role="alert">
        <p className="text-text-muted">Your session ended. Sign in again to continue.</p>
      </div>
    );
  }

  const state = navState(item, principal, entitlements);
  if (state === 'allowed') return children;
  return <NoAccessPage />;
}
