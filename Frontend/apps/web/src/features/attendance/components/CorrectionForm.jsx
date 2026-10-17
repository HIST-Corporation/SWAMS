import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, FormField, Input, Textarea } from '@swams/ui';
import { useCorrectionRequest } from '../hooks/useCorrection.js';

/**
 * Request a punch correction (§7.5). The machine decides when the request is
 * submittable and what the screen shows; the form only edits and sends. A
 * rejected submit keeps the typed values so nothing is retyped.
 */
export function CorrectionForm() {
  const { t } = useTranslation('attendance');
  const { status, context, send } = useCorrectionRequest();
  const { proposed } = context;
  // Errors appear after the first blur or a submit attempt — never on an
  // untouched form (§8.9).
  const [touched, setTouched] = useState(false);

  if (status === 'inReview') {
    return (
      <section role="status" className="bg-surface border-success-soft rounded-card border p-5">
        <h2 className="text-md flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.75} />
          {t('corrections.submittedTitle')}
        </h2>
        <p className="text-text-muted mt-1 text-sm">{t('corrections.submittedBody')}</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => send({ type: 'WITHDRAW' })}>
            {t('corrections.another')}
          </Button>
        </div>
      </section>
    );
  }

  const timesMissing = touched && (!proposed.clockIn || !proposed.clockOut);
  const reasonTooShort = touched && proposed.reason.trim().length < 5;

  return (
    <form
      className="bg-surface border-border rounded-card grid gap-4 border p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        send({ type: 'SUBMIT' });
      }}
    >
      <div>
        <h2 className="text-md">{t('corrections.open')}</h2>
        <p className="text-text-muted mt-1 text-sm">{t('corrections.intro')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t('corrections.clockIn')}
          required
          error={timesMissing ? t('corrections.error.times') : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="time"
              className="tabular"
              aria-describedby={describedBy}
              invalid={invalid}
              value={proposed.clockIn}
              onBlur={() => setTouched(true)}
              onChange={(event) => send({ type: 'EDIT', patch: { clockIn: event.target.value } })}
            />
          )}
        </FormField>

        <FormField label={t('corrections.clockOut')} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="time"
              className="tabular"
              aria-describedby={describedBy}
              invalid={invalid}
              value={proposed.clockOut}
              onChange={(event) => send({ type: 'EDIT', patch: { clockOut: event.target.value } })}
            />
          )}
        </FormField>
      </div>

      <FormField
        label={t('corrections.reason')}
        required
        hint={t('corrections.reasonHint')}
        error={reasonTooShort ? t('corrections.error.reason') : undefined}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            rows={3}
            aria-describedby={describedBy}
            invalid={invalid}
            value={proposed.reason}
            onBlur={() => setTouched(true)}
            onChange={(event) => send({ type: 'EDIT', patch: { reason: event.target.value } })}
          />
        )}
      </FormField>

      {status === 'error' ? (
        <div
          role="alert"
          className="bg-danger-soft text-danger-text rounded-input flex items-start gap-2 px-3 py-2 text-sm"
        >
          <AlertTriangle aria-hidden="true" size={16} strokeWidth={1.75} />
          <span>
            {context.error?.message ?? t('corrections.error.body')}
            {context.error?.requestId ? (
              <span className="block text-xs opacity-80">
                {t('requestId', { ns: 'common', id: context.error.requestId })}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={status === 'submitting'}>
          {status === 'submitting' ? t('corrections.submitting') : t('corrections.submit')}
        </Button>
        {status === 'error' ? (
          <Button variant="quiet" onClick={() => send({ type: 'RETRY' })}>
            {t('tryAgain')}
          </Button>
        ) : null}
        <p className="text-text-faint text-xs">{t('policyNote')}</p>
      </div>
    </form>
  );
}
