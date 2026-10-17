import { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

/** Multiline input; same token contract as Input. */
export const Textarea = forwardRef(function Textarea(
  { invalid = false, rows = 4, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'bg-surface border-border text-text placeholder:text-text-faint w-full rounded-input border px-3 py-2 text-base transition-colors duration-feedback ease-standard',
        'hover:border-text-faint focus-visible:border-primary focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-55',
        invalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger',
        className,
      )}
      {...props}
    />
  );
});
