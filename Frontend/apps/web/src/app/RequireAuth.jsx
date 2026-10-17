import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/SessionProvider.jsx';

/**
 * Auth guard (Section 4.1 step 1, Section 7.3): renders from the session
 * machine — `unknown`/`refreshing` show the skeleton; `anonymous` and
 * `sessionEnded` redirect to /login carrying the return route (same route
 * after re-login). Permission/entitlement stays in RequirePermission.
 */
export function RequireAuth({ children }) {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) return children;

  if (status === 'anonymous' || status === 'sessionEnded') {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{ returnTo: returnTo !== '/login' ? returnTo : '/dashboard' }}
      />
    );
  }

  // unknown | refreshing | authenticating | signingOut — designed loading.
  return (
    <div className="bg-bg flex min-h-dvh items-center justify-center" aria-busy="true">
      <div
        className="border-border bg-surface animate-pulse rounded-hero h-40 w-80 max-w-[90%]"
        role="status"
      />
    </div>
  );
}
