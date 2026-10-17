import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button, Checkbox, FormField, Input, ThemeToggle } from '@swams/ui';
import { signInSchema } from '@swams/validation';
import { useAuth } from '../SessionProvider.jsx';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm.jsx';
import { LoginBrand } from '../components/LoginBrand.jsx';
import { LoginPersonaPicker } from '../components/LoginPersonaPicker.jsx';
import { LoginRolePicker } from '../components/LoginRolePicker.jsx';
import { PasswordField } from '../components/PasswordField.jsx';
import { ALL_DEMO_EMAIL_KEYS, demoEmailKey, personasFor } from '../personas.js';
import { forgetMe, readRemembered, rememberMe } from '../rememberLogin.js';

/**
 * Login — a port of the prototype's `#login-screen` (SWAMS_Unified.html): a
 * deep brand panel on the left, the form on the right, the two role tabs
 * (Administration / Staff) above the fields, and the staff persona cards the
 * design reveals on the Staff tab.
 *
 * AUTO-FILLED, NOT LISTED (owner's call, 2026-10-12): the prototype's DEMO
 * CREDENTIALS card is gone — the form opens already carrying the selected
 * role's demo account, so signing into any persona is one click on the role
 * control. The credentials are still labelled as demo data under the button
 * (Section 9.6: a mock is never passed off as production), and switching role
 * or persona swaps the address AND the password together, because the email is
 * what the mock reads (`features/auth/mocks/handlers.js`).
 *
 * Renders from the session machine: form → mfaRequired → verifying → app;
 * errors inline. "Remember me" prefills email + portal next visit — it never
 * extends the session, which 7.3 leaves to the server.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const { status, isAuthenticated, lastError, signIn, verifyMfa, cancelMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo ?? '/dashboard';

  // 7.3: return to the same route the session ended on.
  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true });
  }, [isAuthenticated, navigate, returnTo]);

  /** The demo address that signs into a portal/persona pair. */
  const demoEmailFor = (portalValue, personaValue) => t(demoEmailKey(portalValue, personaValue));

  /** Is this one of the demo addresses (as opposed to a hand-typed one)? */
  const isDemoAddress = (value) =>
    [...ALL_DEMO_EMAIL_KEYS, 'auth.demoMfaEmail'].some((key) => t(key) === value);

  const [remembered] = useState(readRemembered);
  // The prototype opens on the management portal with the HR demo account in
  // place; the management portal offers four of the six core roles as cards.
  const [portal, setPortal] = useState(remembered?.portal ?? 'hr');
  // The persona card behind the picker; its email decides the session. Falls
  // back to the portal's default card when the stored one doesn't belong.
  const [persona, setPersona] = useState(() => {
    const stored = remembered?.persona;
    const valid = personasFor(remembered?.portal ?? 'hr').some((card) => card.value === stored);
    if (valid) return stored;
    return (remembered?.portal ?? 'hr') === 'hr' ? 'hr' : 'staff';
  });
  // Autofill (owner's call): a remembered address is honoured, otherwise the
  // form opens on the selected role's demo account, password included. The
  // portal default is the portal's own first card, so the management portal
  // never autofills a staff address.
  const portalDefaultPersona = (remembered?.portal ?? 'hr') === 'hr' ? 'hr' : 'staff';
  const [email, setEmail] = useState(
    () =>
      remembered?.email ??
      demoEmailFor(remembered?.portal ?? 'hr', remembered?.persona ?? portalDefaultPersona),
  );
  const [password, setPassword] = useState(() =>
    isDemoAddress(remembered?.email ?? demoEmailFor(portal, persona)) ? t('auth.demoPassword') : '',
  );
  const [code, setCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [remember, setRemember] = useState(Boolean(remembered));
  const [view, setView] = useState('signin'); // signin | forgot

  const inMfa = status === 'mfaRequired';
  const inForgot = view === 'forgot' && !inMfa;
  const busy = status === 'authenticating' || status === 'verifying';
  const failed = status === 'anonymous' && Boolean(lastError);

  /**
   * Switching portals or personas swaps the whole demo account — address and
   * password — but never overwrites a hand-typed address, so a real user is not
   * silently replaced by a demo email.
   */
  const applyDemoAccount = (nextPortal, nextPersona) => {
    if (email && !isDemoAddress(email)) return;
    setEmail(demoEmailFor(nextPortal, nextPersona));
    setPassword(t('auth.demoPassword'));
    setFieldErrors({});
  };

  const changePortal = (next) => {
    const valid = personasFor(next).some((card) => card.value === persona);
    const nextPersona = valid ? persona : next === 'hr' ? 'hr' : 'staff';
    setPortal(next);
    setPersona(nextPersona);
    applyDemoAccount(next, nextPersona);
  };

  const changePersona = (next) => {
    setPersona(next);
    applyDemoAccount(portal, next);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (busy) return;

    if (inMfa) {
      if (!/^\d{6}$/.test(code)) {
        setFieldErrors({ code: 'auth.error.codeFormat' });
        return;
      }
      setFieldErrors({});
      verifyMfa({ code, portal });
      return;
    }

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors = {};
      for (const issue of parsed.error.issues)
        errors[issue.path[0]] = `auth.error.${issue.path[0]}`;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (remember) rememberMe({ email: parsed.data.email, portal, persona });
    else forgetMe();
    signIn({ ...parsed.data, portal });
  };

  return (
    <main className="bg-bg text-text flex min-h-dvh">
      <LoginBrand />

      <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        {/* Section 8.3 reaches the sign-in screen too: light/dark/system is a
            pre-session choice (localStorage via ThemeProvider), promoted to
            /me/preferences only once the user is signed in. Positioned in the
            form pane so it survives the MFA and forgot-password views. */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="font-display text-text text-[28px] font-extrabold tracking-tight">
            {inMfa ? t('auth.mfaTitle') : inForgot ? t('auth.forgotTitle') : t('login.welcomeBack')}
          </h1>
          <p className="text-text-faint mt-1.5 text-sm">
            {inMfa
              ? t('auth.mfaSubtitle')
              : inForgot
                ? t('auth.forgotSubtitle')
                : t('login.welcomeBackSub')}
          </p>

          {inForgot ? (
            <div className="mt-7">
              <ForgotPasswordForm onBack={() => setView('signin')} />
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-4" aria-busy={busy}>
              {inMfa ? (
                <FormField
                  label={t('auth.mfaCode')}
                  hint={t('auth.mfaHint')}
                  error={fieldErrors.code ? t(fieldErrors.code) : undefined}
                  required
                >
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="tabular"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  )}
                </FormField>
              ) : (
                <>
                  <LoginRolePicker portal={portal} onChange={changePortal} disabled={busy} />

                  {/* Management portal: Executive / HR / Dept. Manager / Team
                      Lead cards. Staff portal: the four staff personas. Each
                      card is its own demo account — the email picks the
                      session, so the server never trusts a client role. */}
                  <LoginPersonaPicker
                    personas={personasFor(portal)}
                    name="login-persona"
                    value={persona}
                    onChange={changePersona}
                    disabled={busy}
                  />

                  <FormField
                    label={t('auth.email')}
                    error={fieldErrors.email ? t(fieldErrors.email) : undefined}
                    required
                  >
                    {({ id, describedBy, invalid }) => (
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
                          invalid={invalid}
                          name="email"
                          type="email"
                          autoComplete="email"
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    )}
                  </FormField>

                  <PasswordField
                    label={t('auth.password')}
                    error={fieldErrors.password ? t(fieldErrors.password) : undefined}
                    value={password}
                    onChange={setPassword}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <label className="text-text-muted flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={remember}
                        onCheckedChange={(next) => setRemember(next === true)}
                      />
                      {t('auth.rememberMe')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-primary rounded-input focus-visible:ring-primary text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>
                </>
              )}

              {failed ? (
                <p
                  role="alert"
                  className="border-danger/25 bg-danger-soft/80 text-danger-text rounded-input border px-3 py-2 text-xs"
                >
                  {t('auth.error.signInFailed')}
                </p>
              ) : null}

              <Button type="submit" disabled={busy} loading={busy} className="h-11">
                {busy ? t('auth.signingIn') : inMfa ? t('auth.verify') : t('auth.signIn')}
              </Button>

              {inMfa ? (
                <Button type="button" variant="quiet" onClick={cancelMfa}>
                  {t('auth.useAnotherAccount')}
                </Button>
              ) : null}
            </form>
          )}

          {!inMfa && !inForgot ? (
            <p className="text-text-faint mt-4 text-center text-[11px]">{t('auth.demoAutofill')}</p>
          ) : null}

          <p className="text-text-faint mt-6 text-center text-xs">
            {t('login.needAccess')}{' '}
            <Link to="/setup" className="text-primary font-medium">
              {t('login.setupLink')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
