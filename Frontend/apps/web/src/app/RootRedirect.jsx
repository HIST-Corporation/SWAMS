import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/SessionProvider.jsx';

/**
 * Root gate (Section 7.3 + the landing entry rule):
 * a signed-in session goes straight to the dashboard; everyone else gets the
 * public landing page. "Second time onwards" is exactly the session state —
 * the refresh cookie is what marks a returning visit, so no first-visit flag
 * is stored anywhere and nothing can be faked from the client.
 *
 * `unknown`/`refreshing` render nothing (the shell's own skeleton covers the
 * redirect flash), so the landing never flashes for a signed-in user.
 */
export function RootRedirect() {
  const { status, isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (status === 'anonymous' || status === 'sessionEnded') {
    return <Navigate to="/landing" replace />;
  }
  return null;
}
