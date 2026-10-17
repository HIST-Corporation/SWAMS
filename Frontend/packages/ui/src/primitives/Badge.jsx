import { cva } from 'class-variance-authority';
import { cn } from '../utils/cn.js';

// The prototype's `.badge`: 11px, medium, 3px/9px padding, fully rounded.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-[11px] font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-sunken text-text-muted',
        primary: 'bg-primary-soft text-primary',
        success: 'bg-success-soft text-success-text',
        warning: 'bg-warning-soft text-warning-text',
        danger: 'bg-danger-soft text-danger-text',
        info: 'bg-info-soft text-info-text',
        violet: 'bg-violet-soft text-violet-text',
        rose: 'bg-rose-soft text-rose-text',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/**
 * Badge for statuses (Section 8.7). Status is never color alone — pair with an
 * icon or text at the call site (Section 8.9).
 */
export function Badge({ tone, className, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

export { badgeVariants };
