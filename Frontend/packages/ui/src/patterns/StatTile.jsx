import { cn } from '../utils/cn.js';

/**
 * The prototype's `.stat-card` (SWAMS_Unified.html): surface card, an icon
 * chip left / trend pill right head row, a 28px Syne figure, then the label
 * underneath. `brand` is `.stat-card.hero-lime` — the one filled panel.
 */
const TONES = {
  plain: 'bg-surface-raised border border-border',
  brand: 'bg-brand border border-brand',
};

const TEXT = {
  plain: 'text-text',
  brand: 'text-brand-text',
};

const ICON_TONES = {
  plain: 'bg-primary-soft text-primary',
  brand: 'bg-white/[0.16] text-brand-text',
};

/**
 * StatTile (Section 8.7): a KPI panel. Numbers render tabular in Syne, the
 * prototype's display face. Pass `icon` for the icon chip — it is decorative,
 * because the label beside it always names the metric (Section 8.9). `badge`
 * rides the head row as a trend pill and `footer` sits under the label (a
 * proportion meter); both optional. `valueClassName` promotes a tile to hero
 * scale without forking the component.
 *
 * The head row is only as tall as what is in it, so a rail of plain figures
 * (the team board's In / Late / … strip) stays compact. That means the figures
 * in one row line up only when every tile in it has an icon or a pill — a row
 * that mixes the two pushes the empty tile's number below its neighbours' by
 * the pill's height, which is what happened on Home before the staff tiles were
 * given icons. Give every tile in a row a head element (icon or badge).
 *
 * @param {{ label: string, value: string, hint?: string, tone?: 'plain'|'brand', icon?: React.ReactNode, badge?: React.ReactNode, footer?: React.ReactNode, valueClassName?: string }} props
 */
export function StatTile({
  label,
  value,
  hint,
  tone = 'plain',
  icon,
  badge,
  footer,
  valueClassName,
  className,
  ...props
}) {
  const palette = TONES[tone] ?? TONES.plain;
  const ink = TEXT[tone] ?? TEXT.plain;

  return (
    <div className={cn('rounded-card p-5', palette, ink, className)} {...props}>
      <div className="flex min-h-10 items-start justify-between gap-3 empty:hidden">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-input',
              ICON_TONES[tone] ?? ICON_TONES.plain,
            )}
          >
            {icon}
          </span>
        ) : null}
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <div
        className={cn(
          'font-display tabular mt-3.5 text-[28px] leading-none font-bold tracking-tight',
          valueClassName,
        )}
      >
        {value}
      </div>

      <div className={cn('mt-1 text-xs', tone === 'brand' ? 'opacity-75' : 'text-text-faint')}>
        {label}
      </div>

      {hint ? <div className="text-text-faint mt-0.5 text-xs">{hint}</div> : null}
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}
