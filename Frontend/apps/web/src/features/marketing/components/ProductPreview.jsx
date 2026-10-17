import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheckBig, ListTodo, Timer, UserRound } from 'lucide-react';

/**
 * Product preview (the landing's memorable element, §9.1) — an original SWAMS
 * mock of the manager's morning screen: three KPI tiles that count up, a mini
 * kanban, a week attendance bar chart and a live presence badge. It replaces the
 * old clock-in demo with something that shows the *product*, and every motion
 * comes from the shared marketing motion kit (globals.css), which the global
 * prefers-reduced-motion block neutralises.
 *
 * Purely decorative sample data (§12.1: a demo is never passed off as the live
 * product) — nothing is sent anywhere; there is no session and no endpoint here
 * (§7.7). The numbers are literals in the component (like the module tints),
 * not user copy, so they stay out of the i18n catalogs.
 */

/** True when the visitor has asked the OS for reduced motion. */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Count from 0 to `target` once mounted. Reduced-motion (and any environment
 * without rAF) starts — and stays — at the final value, so the number is never
 * animated for someone who asked for less motion.
 */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const frame = useRef(0);

  useEffect(() => {
    // Already at the target (reduced motion / no rAF): nothing to animate.
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast then settles, so the number feels alive but lands.
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}

function KpiTile({ icon: Icon, labelKey, captionKey, value, tone, delay }) {
  const { t } = useTranslation('marketing');
  const count = useCountUp(value);
  return (
    <div
      className="mkt-pop border-border bg-surface rounded-card mkt-pop-card border p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 place-items-center rounded-input ${tone}`}
        >
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <span className="font-display tabular text-2xl font-bold">{count}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{t(labelKey)}</p>
      <p className="text-text-faint text-xs">{t(captionKey)}</p>
    </div>
  );
}

const lanes = [
  { key: 'todo', cards: ['preview.cards.review', 'preview.cards.onboard'] },
  { key: 'doing', cards: ['preview.cards.approve'] },
  { key: 'done', cards: ['preview.cards.standup', 'preview.cards.geofence'] },
];

export function ProductPreview() {
  const { t } = useTranslation('marketing');
  const days = t('preview.days', { returnObjects: true });
  const dayList = Array.isArray(days) ? days : [];
  // Decorative attendance percentages for the week bar chart.
  const week = [86, 92, 78, 95, 88];

  return (
    <figure
      aria-labelledby="preview-title"
      className="border-border bg-bg shadow-2 rounded-hero relative overflow-hidden border"
    >
      {/* Aurora glow behind the mock window. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="mkt-aurora bg-primary/25 -top-16 -left-10 h-48 w-48" />
        <span
          className="mkt-aurora bg-accent/20 -right-10 -bottom-16 h-56 w-56"
          style={{ animationDelay: '4s' }}
        />
      </div>

      {/* Window chrome */}
      <div className="border-border bg-surface/80 relative flex items-center gap-2 border-b px-4 py-2.5 backdrop-blur">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="bg-danger/70 h-2.5 w-2.5 rounded-full" />
          <span className="bg-warning/70 h-2.5 w-2.5 rounded-full" />
          <span className="bg-success/70 h-2.5 w-2.5 rounded-full" />
        </span>
        <span id="preview-title" className="text-text-muted ms-2 text-xs font-medium">
          {t('preview.windowLabel')}
        </span>
        <span className="ms-auto inline-flex items-center gap-1.5 rounded-pill border border-success/30 bg-success-soft px-2 py-0.5 text-xs font-medium text-success-text">
          <span aria-hidden="true" className="bg-success mkt-pulse h-1.5 w-1.5 rounded-full" />
          {t('preview.live')}
        </span>
      </div>

      <div className="relative grid gap-4 p-4 sm:p-5">
        {/* KPI tiles */}
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            icon={UserRound}
            labelKey="preview.tiles.present.label"
            captionKey="preview.tiles.present.caption"
            value={42}
            tone="bg-chip-indigo text-chip-indigo-fg"
            delay={0}
          />
          <KpiTile
            icon={Timer}
            labelKey="preview.tiles.leave.label"
            captionKey="preview.tiles.leave.caption"
            value={6}
            tone="bg-chip-marigold text-chip-marigold-fg"
            delay={90}
          />
          <KpiTile
            icon={CircleCheckBig}
            labelKey="preview.tiles.tasks.label"
            captionKey="preview.tiles.tasks.caption"
            value={128}
            tone="bg-chip-teal text-chip-teal-fg"
            delay={180}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          {/* Mini kanban */}
          <div className="border-border bg-surface rounded-card border p-4">
            <div className="mb-3 flex items-center gap-2">
              <ListTodo aria-hidden="true" size={15} strokeWidth={1.75} className="text-primary" />
              <h3 className="text-sm font-semibold">{t('preview.boardLabel')}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {lanes.map((lane, laneIndex) => (
                <div key={lane.key} className="grid content-start gap-2">
                  <p className="text-text-faint text-[11px] font-semibold tracking-wide uppercase">
                    {t(`preview.lanes.${lane.key}`)}
                  </p>
                  {lane.cards.map((cardKey, cardIndex) => (
                    <p
                      key={cardKey}
                      className="mkt-pop border-border bg-bg text-text-muted rounded-input mkt-pop-card border px-2 py-1.5 text-[11px]"
                      style={{ animationDelay: `${240 + laneIndex * 80 + cardIndex * 60}ms` }}
                    >
                      {t(cardKey)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Week attendance chart */}
          <div className="border-border bg-surface rounded-card grid content-start gap-3 border p-4">
            <h3 className="text-sm font-semibold">{t('preview.weekLabel')}</h3>
            <ul className="flex h-24 items-end justify-between gap-2">
              {week.map((pct, index) => (
                <li
                  key={dayList[index] ?? index}
                  className="grid flex-1 justify-items-center gap-1.5"
                >
                  <span
                    aria-hidden="true"
                    className="mkt-bar bg-primary/80 w-full rounded-t-input"
                    style={{ height: `${pct}%`, animationDelay: `${index * 90}ms` }}
                  />
                  <span className="text-text-faint text-[10px]">{dayList[index]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <figcaption className="text-text-faint relative px-4 pb-4 text-xs sm:px-5">
        {t('preview.sampleNote')}
      </figcaption>
    </figure>
  );
}
