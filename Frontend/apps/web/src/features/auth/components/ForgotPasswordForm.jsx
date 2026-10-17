import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FormField, Input } from '@swams/ui';
import { passwordResetRequestSchema } from '@swams/validation';
import { requestPasswordReset } from '../../../lib/authApi.js';

/**
 * ForgotPasswordForm — the login screen's reset-request view (contract
 * request 16). Swaps in for the sign-in form the same way the MFA challenge
 * does, so the shell never moves.
 *
 * Three visible states (idle → sending → sent | error) are a trivial form
 * flow, so this stays plain `useState` per ADR 0003 — the session machine
 * only owns authentication, and a reset request never changes the session.
 *
 * The confirmation is enumeration-safe on purpose: it repeats the address
 * back without confirming an account exists, matching the mock's fixed 202.
 *
 * @param {{ onBack: () => void }} props
 */
export function ForgotPasswordForm({ onBack }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const sending = status === 'sending';

  const onSubmit = (event) => {
    event.preventDefault();
    if (sending) return;

    const parsed = passwordResetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError('auth.error.email');
      return;
    }
    setFieldError(null);
    setStatus('sending');
    requestPasswordReset(parsed.data)
      .then(() => setStatus('sent'))
      .catch(() => setStatus('error'));
  };

  if (status === 'sent') {
    return (
      <div className="grid gap-4" role="status">
        <div className="border-border bg-accent-soft/50 rounded-card border px-4 py-3">
          <p className="text-text text-sm font-semibold">{t('auth.forgotSentTitle')}</p>
          <p className="text-text-muted mt-1 text-sm">{t('auth.forgotSent', { email })}</p>
        </div>
        <Button type="button" variant="secondary" onClick={onBack}>
          {t('auth.backToSignIn')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-busy={sending}>
      <FormField label={t('auth.email')} error={fieldError ? t(fieldError) : undefined} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </FormField>

      {status === 'error' ? (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text border-danger rounded-input border px-3 py-2 text-sm"
        >
          {t('auth.error.sendFailed')}
        </p>
      ) : null}

      <Button type="submit" disabled={sending} loading={sending}>
        {sending ? t('auth.forgotSending') : t('auth.forgotSubmit')}
      </Button>

      <Button type="button" variant="quiet" onClick={onBack}>
        {t('auth.backToSignIn')}
      </Button>
    </form>
  );
}
