import { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Text input (Section 8.7). Inputs are never below 16px on mobile (8.2 type rule).
 * Error styling is driven by `aria-invalid`; the message itself belongs in FormField.
 */
export const Input = forwardRef(function Input({ invalid = false, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'bg-surface border-border text-text placeholder:text-text-faint h-11 w-full rounded-input border px-3 text-base transition-colors duration-feedback ease-standard',
        'hover:border-text-faint focus-visible:border-primary focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-55',
        invalid && 'border-danger focus-visible:border-danger focus-visible:ring-danger',
        className,
      )}
      {...props}
    />
  );
});
