import { useEffect, useRef, useState } from 'react';
import { Check, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, cn } from '@swams/ui';
import { useAuth } from '../features/auth/SessionProvider.jsx';
import { AVAILABILITY, usePresenceStore } from '../stores/presence.js';

/** Availability → dot tone; the label beside it always carries the meaning (§8.9). */
const DOT = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warning',
  do_not_disturb: 'bg-violet',
  offline: 'bg-text-muted',
};

/**
 * Topbar user menu (Section 8.4): portrait, name, org, a presence/status
 * dropdown, and sign out.
 *
 * The status dropdown sets your availability (online / busy / away / do not
 * disturb / offline). It is a client-side preference persisted on this device
 * (§5) — there is no presence endpoint — but the rest of the app reads it live:
 * the topbar avatar wears a dot for it, and Do not disturb mutes the bell and
 * pauses the message composer so nobody is poked mid-focus. Closes on Escape
 * and outside click; sign out goes through the session machine (SIGN_OUT), so
 * the state after sign-out is deterministic (anonymous → redirect to /login).
 */
export function UserMenu({ user, org }) {
  const { t } = useTranslation();
  const { t: tnav } = useTranslation('nav');
  const { t: tdash } = useTranslation('dashboard');
  const { signOut, status: authStatus } = useAuth();
  const presence = usePresenceStore((state) => state.status);
  const setPresence = usePresenceStore((state) => state.setStatus);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const signingOut = authStatus === 'signingOut';
  // Dummy portrait for now: the demo roster ships illustrated portraits in
  // `public/avatars/{id}.svg` (scripts/gen-avatars.mjs); Avatar falls back to
  // initials when a person has no file, so a missing image degrades gracefully.
  const portrait = user?.id ? `/avatars/${user.id}.svg` : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-visible:ring-primary rounded-pill focus-visible:outline-none focus-visible:ring-2"
      >
        <span className="relative inline-flex">
          <Avatar name={user?.name ?? 'SWAMS'} size="sm" src={portrait} status={presence} />
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={tnav('yourAccount')}
          className="border-border bg-surface z-toast absolute right-0 mt-2 w-60 rounded-input border p-2 shadow-2 focus-visible:outline-none"
        >
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar name={user?.name ?? 'SWAMS'} size="sm" src={portrait} status={presence} />
            <span className="min-w-0">
              <p className="text-text truncate text-sm font-semibold">{user?.name ?? ''}</p>
              <p className="text-text-faint truncate text-xs">{user?.email ?? org?.name ?? ''}</p>
            </span>
          </div>

          <div className="border-border mt-1 border-t pt-1">
            <p
              id="user-menu-status"
              className="text-text-faint px-2 py-1 text-[11px] font-semibold tracking-wide uppercase"
            >
              {tdash('status.label')}
            </p>
            <div role="group" aria-labelledby="user-menu-status" className="grid">
              {AVAILABILITY.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={presence === option}
                  onClick={() => setPresence(option)}
                  className="text-text-muted hover:bg-surface-sunken focus-visible:ring-primary flex w-full items-center gap-2 rounded-input px-2 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2"
                >
                  <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-pill', DOT[option])} />
                  <span className="flex-1">{tdash(`status.${option}`)}</span>
                  {presence === option ? (
                    <Check aria-hidden="true" size={14} strokeWidth={2.5} className="text-primary" />
                  ) : null}
                </button>
              ))}
            </div>
            <p className="text-text-faint px-2 pt-1 pb-1.5 text-[11px]">{tdash('status.hint')}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="text-danger-text hover:bg-surface-sunken focus-visible:ring-primary mt-1 flex w-full items-center gap-2 rounded-input px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:opacity-55"
          >
            <LogOut aria-hidden="true" size={16} strokeWidth={1.75} />
            {signingOut ? t('auth.signingOut') : t('auth.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
