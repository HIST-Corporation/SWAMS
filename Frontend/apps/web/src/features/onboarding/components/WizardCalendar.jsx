import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, Input } from '@swams/ui';

/**
 * Wizard step 3: calendar system (BS/AD — Section 3: BS is the civil
 * calendar in Nepal) and fiscal year start (Nepali FY: Shrawan 1 ≈ 07-16).
 */
export function WizardCalendar({ draft, errors, onUpdate }) {
  const { t } = useTranslation();
  const radioBase = useId();
  const options = [
    { value: 'bs', label: t('wizard.calendarBs'), hint: t('wizard.calendarBsHint') },
    { value: 'ad', label: t('wizard.calendarAd'), hint: t('wizard.calendarAdHint') },
  ];

  return (
    <section className="grid gap-5" aria-label={t('wizard.step3')}>
      <fieldset className="grid gap-2">
        <legend className="text-text mb-1 text-sm font-medium">{t('wizard.calendar')}</legend>
        {options.map((option) => {
          const checked = draft.calendar === option.value;
          return (
            <label
              key={option.value}
              htmlFor={`${radioBase}-${option.value}`}
              className={`border-border rounded-input flex cursor-pointer items-start gap-3 border p-3 ${
                checked ? 'border-primary' : ''
              }`}
            >
              <input
                id={`${radioBase}-${option.value}`}
                type="radio"
                name="calendar"
                value={option.value}
                checked={checked}
                onChange={() => onUpdate({ calendar: option.value })}
                className="accent-primary mt-1"
              />
              <span className="text-text block text-sm font-medium">
                {option.label}
                <span className="text-text-faint block text-xs">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <FormField
        label={t('wizard.fiscalYear')}
        hint={t('wizard.fiscalYearHint')}
        error={errors.fiscalYearStart ? t(errors.fiscalYearStart) : undefined}
        required
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name="fiscalYearStart"
            className="tabular"
            inputMode="numeric"
            placeholder="07-16"
            value={draft.fiscalYearStart}
            onChange={(e) => onUpdate({ fiscalYearStart: e.target.value })}
          />
        )}
      </FormField>
    </section>
  );
}
