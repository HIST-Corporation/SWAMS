import { useTranslation } from 'react-i18next';

/**
 * Wizard review step: read-only summary before submit. Sentence-case labels,
 * values from the machine context (never component state).
 */
export function WizardReview({ draft }) {
  const { t } = useTranslation();
  const rows = [
    { label: t('wizard.orgName'), value: draft.name },
    { label: t('wizard.timezone'), value: draft.timezone },
    { label: t('wizard.sites'), value: draft.sites.join(', ') },
    {
      label: t('wizard.calendar'),
      value: draft.calendar === 'bs' ? t('wizard.calendarBs') : t('wizard.calendarAd'),
    },
    { label: t('wizard.fiscalYear'), value: draft.fiscalYearStart },
  ];

  return (
    <section className="grid gap-3" aria-label={t('wizard.step4')}>
      <dl className="border-border rounded-hero grid gap-0 border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border-border flex items-baseline justify-between gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <dt className="text-text-muted text-sm">{row.label}</dt>
            <dd className="text-text text-sm font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-text-faint text-sm">{t('wizard.reviewNote')}</p>
    </section>
  );
}
