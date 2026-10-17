import { useContext, useEffect, useMemo } from 'react';
import { useActor } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { createSessionMachine } from './machines/session.machine.js';
import { onSessionEnded } from '../../lib/authStore.js';
import { refreshSession, signIn, signOut, verifyMfa } from '../../lib/authApi.js';
import { appKeys } from '../../lib/keys.js';
import { SessionContext } from './SessionContext.js';

/**
 * SessionProvider (Section 5 + 7.3): the session machine owns auth state;
 * TanStack Query's `session` entry is a projection the machine primes on
 * authentication. Components read via `useAuth()` and render from
 * `status` (machine `matches`) — never from scattered booleans.
 */

export function SessionProvider({ children }) {
  const queryClient = useQueryClient();

  // Stable machine identity (useIdleActorRef recreates on config change —
  // an inline machine would reset the session on every render).
  const machine = useMemo(
    () => createSessionMachine({ restore: refreshSession, signIn, verifyMfa, signOut }),
    [],
  );

  // useActor (not useActorRef): re-renders the provider on every transition,
  // which is what redirects RequireAuth on anonymous/sessionEnded.
  const [state, send, actor] = useActor(machine);

  // apiClient's onSessionEnded → machine SESSION_ENDED (7.3).
  useEffect(() => onSessionEnded(() => send({ type: 'SESSION_ENDED' })), [send]);

  // Prime the session query whenever the machine reaches authenticated, and
  // drop it whenever the session ends so AppShell never serves stale data.
  useEffect(() => {
    const sub = actor.subscribe((snap) => {
      if (snap.matches('authenticated')) {
        queryClient.setQueryData(appKeys.session, snap.context.session);
      } else if (snap.matches('anonymous') || snap.matches('sessionEnded')) {
        queryClient.setQueryData(appKeys.session, null);
        queryClient.removeQueries({ queryKey: appKeys.session });
      }
    });
    return () => sub.unsubscribe();
  }, [actor, queryClient]);

  const value = useMemo(() => {
    return {
      status: String(
        [
          'unknown',
          'refreshing',
          'anonymous',
          'authenticating',
          'mfaRequired',
          'verifying',
          'authenticated',
          'expiring',
          'signingOut',
          'sessionEnded',
        ].find((s) => state.matches(s)) ?? 'unknown',
      ),
      isAuthenticated: state.matches('authenticated') || state.matches('expiring'),
      isExpiring: state.matches('expiring'),
      session: state.context.session,
      lastError: state.context.lastError,
      signIn: (credentials) => send({ type: 'SIGN_IN', credentials }),
      verifyMfa: (challenge) => send({ type: 'VERIFY_MFA', challenge }),
      cancelMfa: () => send({ type: 'CANCEL_MFA' }),
      signOut: () => send({ type: 'SIGN_OUT' }),
    };
  }, [send, state]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useAuth must be used inside <SessionProvider>');
  return ctx;
}
