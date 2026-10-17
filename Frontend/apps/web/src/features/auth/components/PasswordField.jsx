import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { FormField, Input } from '@swams/ui';

/**
 * Password field with a show/hide eye toggle (Section 8.9: the toggle is a
 * labelled control, never colour- or icon-only). The accessible name changes
 * with the action ("Show password" ↔ "Hide password"), so screen-reader users
 * hear what the button will do rather than a state flag.
 *
 * The mouse-down default is prevented so clicking the eye never pulls focus
 * out of the field — typing can continue right after a reveal. Keyboard users
 * still reach the button with Tab (44px target, Section 8.9).
 *
 * @param {{ label: string, error?: string, value: string, onChange: (v: string) => void, autoComplete?: string, name?: string }} props
 */
export function PasswordField({
  label,
  error,
  value,
  onChange,
  autoComplete = 'current-password',
  name = 'password',
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const toggleLabel = t(visible ? 'auth.hidePassword' : 'auth.showPassword');

  return (
    <FormField label={label} error={error} required>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <Input
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            name={name}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            className="pr-11"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            // Keep focus in the field on click; Tab still reaches the button.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setVisible((v) => !v)}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="text-text-muted hover:text-text absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {visible ? (
              <EyeOff aria-hidden="true" size={18} strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden="true" size={18} strokeWidth={1.75} />
            )}
          </button>
        </div>
      )}
    </FormField>
  );
}
