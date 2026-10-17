import { forwardRef, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn.js';

/**
 * FormField (Section 8.7): wires label ↔ control ↔ hint/error for accessibility
 * (Section 8.9: labels tied to inputs; errors announced and linked).
 * Inline validation on blur and summary on submit stay in the feature's form.
 *
 * @param {{ label: string, hint?: string, error?: string, required?: boolean, children: (ids: {id: string, describedBy: string, invalid: boolean}) => React.ReactNode }} props
 */
export const FormField = forwardRef(function FormField(
  { label, hint, error, required = false, className, children },
  _ref,
) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  const invalid = Boolean(error);

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label className="text-text text-sm font-medium" htmlFor={id}>
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {' *'}
          </span>
        ) : (
          <span className="text-text-faint text-xs"> ({t('form.optional')})</span>
        )}
      </label>
      {children({ id, describedBy, invalid })}
      {hint && !error ? (
        <p id={hintId} className="text-text-faint text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-danger-text text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
});
