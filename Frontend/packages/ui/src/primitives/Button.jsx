import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

// The prototype's `.btn` (SWAMS_Unified.html): 8px radius, 500 weight, and the
// `.btn-primary` lift on hover (`brightness(1.07) translateY(-1px)` + glow).
// The glow is expressed with the shadow token rather than a raw rgba so the
// light and dark recipes stay theme-aware.
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-button text-[13px] font-medium transition-all duration-feedback ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-brand-text hover:brightness-110 hover:-translate-y-px hover:shadow-1',
        secondary:
          'border border-border-strong bg-transparent text-text-muted hover:bg-surface-sunken hover:text-text',
        quiet: 'text-text-muted hover:bg-surface-sunken hover:text-text',
        danger: 'border border-danger/25 bg-danger-soft text-danger-text hover:bg-danger/15',
        success: 'border border-success/25 bg-success-soft text-success-text hover:bg-success/15',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-[13px]',
        lg: 'h-12 px-5 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

/**
 * Button (Section 8.7): variants primary | secondary | quiet | danger,
 * sizes sm | md | lg, loading state announces via aria-busy.
 * Labels always come from i18n — this component takes text as children.
 */
export const Button = forwardRef(function Button(
  { variant, size, loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" size={16} /> : null}
      {children}
    </button>
  );
});
