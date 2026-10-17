import { cn } from '../utils/cn.js';

/**
 * Stepper (Section 8.7 patterns): numbered progress list for wizards.
 * Renders semantics, not clicks — steps advance through the wizard's own
 * controls. `current` announces via aria-current (Section 8.9).
 *
 * @param {{ steps: string[], current: number, className?: string }} props
 *   `current` is 1-indexed.
 */
export function Stepper({ steps, current, className, ...rest }) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-sm', className)} {...rest}>
      {steps.map((label, index) => {
        const step = index + 1;
        const isCurrent = step === current;
        const isPast = step < current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              isCurrent
                ? 'text-text border-primary font-semibold'
                : isPast
                  ? 'text-text-muted'
                  : 'text-text-faint',
              isCurrent && 'rounded-input border-b-2',
            )}
          >
            <span className="tabular">{step}.</span> {label}
          </li>
        );
      })}
    </ol>
  );
}
