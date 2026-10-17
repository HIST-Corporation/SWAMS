import { useTranslation } from 'react-i18next';
import { ShieldHalf, User } from 'lucide-react';

/**
 * The prototype's login role picker (`#tab-hr` / `#tab-staff` in
 * SWAMS_Unified.html) as a two-up segmented control — Administration (the
 * management portal) vs Staff.
 *
 * It is built from native radio inputs rather than buttons or ARIA tabs: the
 * control answers "which workspace am I signing into?", which is a one-of-two
 * form field. Native radios bring the keyboard behaviour, group semantics and
 * focus handling with them — no custom roving tabindex to get wrong.
 */
const OPTIONS = [
  { value: 'hr', labelKey: 'auth.portalHr', Icon: ShieldHalf },
  { value: 'staff', labelKey: 'auth.portalStaff', Icon: User },
];

/**
 * @param {{ portal: 'hr'|'staff', onChange: (portal: 'hr'|'staff') => void, disabled?: boolean }} props
 */
export function LoginRolePicker({ portal, onChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <fieldset
      disabled={disabled}
      className="border-border bg-surface-sunken flex rounded-input border p-1"
    >
      <legend className="sr-only">{t('auth.portalLabel')}</legend>
      {OPTIONS.map(({ value, labelKey, Icon }) => (
        <label key={value} className="relative flex flex-1">
          {/* The input itself covers the segment, so a click anywhere on it
              lands on the radio — no hidden control that needs a proxy. */}
          <input
            type="radio"
            name="portal"
            value={value}
            checked={portal === value}
            onChange={() => onChange(value)}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[7px]"
          />
          <span className="text-text-muted peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-primary peer-focus-visible:ring-offset-bg flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 py-2.5 text-[13px] font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
            <Icon aria-hidden="true" size={13} strokeWidth={2} />
            {t(labelKey)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
