import { useState } from 'react';
import { ConsoleApp } from './ConsoleApp.jsx';
import { ConsoleLogin } from './ConsoleLogin.jsx';
import { endConsoleSession, readConsoleSession, startConsoleSession } from './session.js';

/**
 * Platform console root (Section 4): its own auth gate and its own session —
 * a separate app, deploy and auth realm from apps/web. The gate renders the
 * sign-in screen until the mock console session exists; signing out clears
 * only the console's own storage key.
 */
export function ConsoleRoot() {
  const [session, setSession] = useState(readConsoleSession);

  const onSignIn = (credentials) => {
    const next = startConsoleSession(credentials);
    if (next) setSession(next);
    return next;
  };

  const onSignOut = () => {
    endConsoleSession();
    setSession(null);
  };

  return session ? (
    <ConsoleApp session={session} onSignOut={onSignOut} />
  ) : (
    <ConsoleLogin onSignIn={onSignIn} />
  );
}
