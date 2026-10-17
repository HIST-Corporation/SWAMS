import { useTranslation } from 'react-i18next';
import { FormField, Input } from '@swams/ui';

/**
 * Wizard step 1: org basics (name + timezone). Timezone defaults to
 * Asia/Kathmandu (8.8 sample data) — editable for orgs abroad.
 */
export function WizardBasics({ draft, errors, onUpdate }) {
  const { t } = useTranslation();
  return (
    <section className="grid gap-5" aria-label={t('wizard.step1')}>
      <FormField
        label={t('wizard.orgName')}
        error={errors.name ? t(errors.name) : undefined}
        required
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="name"
            autoComplete="organization"
            value={draft.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={t('wizard.orgNamePlaceholder')}
          />
        )}
      </FormField>

      <FormField label={t('wizard.timezone')}>
        {({ id, describedBy }) => (
          <select
            id={id}
            aria-describedby={describedBy}
            name="timezone"
            className="bg-surface border-border text-text h-11 w-full rounded-input border px-3 text-base"
            value={draft.timezone}
            onChange={(e) => onUpdate({ timezone: e.target.value })}
          >
            <option value="Asia/Kathmandu">{t('wizard.tzKathmandu')}</option>
            <option value="Asia/Kolkata">{t('wizard.tzKolkata')}</option>
            <option value="UTC">{t('wizard.tzUtc')}</option>
          </select>
        )}
      </FormField>
    </section>
  );
}
