import { cn } from '../utils/cn.js';

/**
 * Card (the prototype's `.card`): surface, hairline border, 12px radius,
 * 20px padding. `hover` adds the prototype's border-and-shadow lift.
 */
export function Card({ hover = false, className, ...props }) {
  return (
    <section
      className={cn(
        'border-border bg-surface-raised rounded-card border p-5',
        hover && 'border-border-strong transition-shadow duration-feedback hover:shadow-1',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The prototype's `.card-title`: uppercase Syne, 12px, faint ink, 12px bottom
 * margin. Pass `id` when the card is a labelled region.
 */
export function CardTitle({ id, className, children, ...props }) {
  return (
    <h2
      id={id}
      className={cn(
        'text-text-faint font-display mb-3 text-xs font-semibold tracking-wide uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

/**
 * The prototype's `.page-title` + `.page-sub` pair.
 *
 * No bottom margin on purpose: the page's own grid owns the vertical rhythm, so
 * a header that carried `mb-7` on top of a `gap-6` page stack produced a 52px
 * hole under the greeting while every other section sat 20px apart.
 */
export function PageHeader({ title, sub, actions, className, ...props }) {
  return (
    <header
      className={cn('flex flex-wrap items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="font-display text-text text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h1>
        {sub ? <p className="text-text-faint mt-1 text-sm">{sub}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
