import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Mail, ShieldAlert } from 'lucide-react';
import { Button, FormField, Input } from '@swams/ui';
import { DEMO_ADMIN } from './session.js';

/**
 * The console's sign-in gate — its OWN auth realm (Section: application
 * separation). A workforce session never unlocks the console. Development
 * fixture: the seeded admin account autofills, matching is exact, and the
 * screen says so out loud (Section 9.6: a mock is never passed off as live).
 *
 * @param {{ onSignIn: (session: object) => void }} props
 */
export function ConsoleLogin({ onSignIn }) {
  const { t } = useTranslation('console');
  const [email, setEmail] = useState(DEMO_ADMIN.email);
  const [password, setPassword] = useState(DEMO_ADMIN.password);
  const [failed, setFailed] = useState(false);

  const onSubmit = (event) => {
    event.preventDefault();
    const session = onSignIn({ email, password });
    // The parent signs in only when the fixture credentials match; a rejected
    // attempt stays on this screen with an inline error (never a redirect).
    setFailed(!session);
  };

  return (
    <main className="bg-bg text-text flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-text text-[24px] font-extrabold tracking-tight">
          {t('auth.title')}
        </h1>
        <p className="text-text-faint mt-1.5 text-sm">{t('auth.subtitle')}</p>

        <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-4">
          <FormField label={t('auth.email')} required>
            {({ id, describedBy }) => (
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  size={14}
                  strokeWidth={1.75}
                  className="text-text-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="pl-9"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}
          </FormField>

          <FormField label={t('auth.password')} required>
            {({ id, describedBy }) => (
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  size={14}
                  strokeWidth={1.75}
                  className="text-text-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            )}
          </FormField>

          {failed ? (
            <p
              role="alert"
              className="border-danger/25 bg-danger-soft/80 text-danger-text rounded-input border px-3 py-2 text-xs"
            >
              <ShieldAlert aria-hidden="true" size={13} strokeWidth={2} className="mr-1 inline" />
              {t('auth.error')}
            </p>
          ) : null}

          <Button type="submit" className="h-11">
            {t('auth.signIn')}
          </Button>
        </form>

        <p className="text-text-faint mt-4 text-center text-[11px]">{t('auth.demoHint')}</p>
        <p className="text-text-faint mt-6 border-border rounded-card border px-3 py-2 text-center text-[11px]">
          {t('auth.realmNote')}
        </p>
      </div>
    </main>
  );
}
