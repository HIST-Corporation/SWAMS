import { useTranslation } from 'react-i18next';

/**
 * The prototype's persona role cards (`#role-picker-wrap` in SWAMS_Unified.html)
 * as a generic radio grid, used by BOTH portals:
 *  - management portal: Executive (CEO) / HR Manager / Dept. Manager / Team Lead
 *    — four of the six core roles (platform super_admin lives in apps/console)
 *  - staff portal: Frontend / Backend / QA / DevOps
 *
 * Built like `LoginRolePicker` — native radios, the input covering the card —
 * so keyboard, grouping and focus behaviour come for free instead of being
 * re-implemented on buttons. Choosing a card also fills the email field with
 * that persona's address (the mock's rule: the email decides which session you
 * get), so the choice is never ambiguous.
 *
 * @param {{ personas: Array<{value: string, labelKey: string, Icon: import('lucide-react').LucideIcon}>, name: string, value: string, onChange: (value: string) => void, disabled?: boolean }} props
 */
export function LoginPersonaPicker({ personas, name, value, onChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <fieldset disabled={disabled} className="grid gap-3">
      <legend className="text-text-muted mb-2 text-xs font-medium">{t('auth.personaLabel')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {personas.map(({ value: option, labelKey, Icon }) => (
          <label key={option} className="relative flex">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none"
            />
            <span className="border-border bg-surface text-text-muted peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-primary flex w-full cursor-pointer items-center gap-2 rounded-input border px-3 py-2.5 text-xs font-medium peer-focus-visible:ring-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
              <Icon aria-hidden="true" size={14} strokeWidth={1.9} />
              {t(labelKey)}
            </span>
          </label>
        ))}
      </div>
      <p className="text-text-faint text-[11px]">{t('auth.personaHint')}</p>
    </fieldset>
  );
}
