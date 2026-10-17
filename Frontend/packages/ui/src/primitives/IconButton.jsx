import { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Icon-only button (Section 8.9: 44px target, accessible name required).
 * @param {{ label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export const IconButton = forwardRef(function IconButton(
  { label, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-button border border-border bg-surface text-text transition-colors duration-feedback ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-55',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
