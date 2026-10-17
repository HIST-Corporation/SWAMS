import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, FormField, Input, Textarea } from '@swams/ui';
import { leaveRequestDraftSchema } from '@swams/validation';
import { useLeaveHolidays, useSubmitLeaveRequest } from '../hooks/useLeave.js';

const EMPTY = { type: 'annual', start: '', end: '', note: '' };

/**
 * Request leave (§7.6). Validates with the shared schema so the error copy and
 * rules match the rest of the app; a failed submit keeps the typed values so
 * nothing is retyped. A submitted request is only shown as sent once the API
 * confirms it — never optimistically (§12.1).
 */
export function LeaveForm() {
  const { t } = useTranslation('leave');
  const submit = useSubmitLeaveRequest();
  const holidays = useLeaveHolidays();

  const [draft, setDraft] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  // Errors appear after the first blur or a submit attempt — never on an
  // untouched form (§8.9).
  const [touched, setTouched] = useState(false);

  const holiday = holidays.rows.find((row) => row.date === draft.start);

  const onSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    const parsed = leaveRequestDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const errors = {};
      for (const issue of parsed.error.issues) errors[issue.path[0]] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    submit.mutate(parsed.data, {
      onSuccess: () => {
        setDraft(EMPTY);
        setTouched(false);
      },
    });
  };

  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  return (
    <form
      className="bg-surface border-border rounded-card grid gap-4 border p-5"
      onSubmit={onSubmit}
      noValidate
      aria-busy={submit.isPending}
    >
      <div>
        <h2 className="text-md">{t('form.title')}</h2>
        <p className="text-text-muted mt-1 text-sm">{t('form.intro')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={t('form.type')} required>
          {({ id, describedBy }) => (
            <select
              id={id}
              aria-describedby={describedBy}
              className="border-border bg-surface focus:border-primary text-text h-11 w-full rounded-input border px-3 text-base outline-none"
              value={draft.type}
              onChange={(event) => set({ type: event.target.value })}
            >
              {['annual', 'sick', 'unpaid', 'special'].map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label={t('form.start')} required error={touched ? fieldErrors.start : undefined}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              className="tabular"
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.start}
              onBlur={() => setTouched(true)}
              onChange={(event) => set({ start: event.target.value })}
            />
          )}
        </FormField>

        <FormField label={t('form.end')} required error={touched ? fieldErrors.end : undefined}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              className="tabular"
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.end}
              onBlur={() => setTouched(true)}
              onChange={(event) => set({ end: event.target.value })}
            />
          )}
        </FormField>
      </div>

      {holiday ? (
        <p className="bg-warning-soft text-warning-text rounded-input px-3 py-2 text-sm">
          {t('form.holidayFlag', { name: holiday.name })}
        </p>
      ) : null}

      <FormField label={t('form.note')} hint={t('form.noteHint')}>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            rows={3}
            aria-describedby={describedBy}
            value={draft.note}
            onChange={(event) => set({ note: event.target.value })}
          />
        )}
      </FormField>

      {submit.isError ? (
        <div
          role="alert"
          className="bg-danger-soft text-danger-text rounded-input flex items-start gap-2 px-3 py-2 text-sm"
        >
          <AlertTriangle aria-hidden="true" size={16} strokeWidth={1.75} />
          <span>
            {submit.error?.message ?? t('form.errorBody')}
            {submit.error?.requestId ? (
              <span className="block text-xs opacity-80">
                {t('requestId', { ns: 'common', id: submit.error.requestId })}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      {submit.isSuccess ? (
        <p
          role="status"
          className="bg-success-soft text-success-text rounded-input flex items-center gap-2 px-3 py-2 text-sm"
        >
          <CheckCircle2 aria-hidden="true" size={16} strokeWidth={1.75} />
          {t('form.sentBody')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={submit.isPending}>
          {submit.isPending ? t('form.submitting') : t('form.submit')}
        </Button>
        <p className="text-text-faint text-xs">{t('form.policyNote')}</p>
      </div>
    </form>
  );
}
