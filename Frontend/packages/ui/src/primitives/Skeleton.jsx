import { cn } from '../utils/cn.js';

/**
 * Loading placeholder (Section 8.11: skeletons, not spinners). Use `block` for
 * free-form shapes; default is a text line.
 */
export function Skeleton({ className, block = false, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-surface-sunken animate-pulse rounded-input',
        block ? 'w-full' : 'h-4 w-full max-w-60',
        className,
      )}
      {...props}
    />
  );
}
