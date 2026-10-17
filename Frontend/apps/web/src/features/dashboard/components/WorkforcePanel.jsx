import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, Skeleton } from '@swams/ui';
import { useOrgDashboard } from '../hooks/useDashboard.js';

/** Section 5A/8.11: Recharts arrives in its own chunk, after the shell. */
const DonutCanvas = lazy(() =>
  import('./DonutCanvas.jsx').then((module) => ({ default: module.DonutCanvas })),
);

/**
 * Literal class names so Tailwind's content scan generates them. The swatches
 * use the SAME palette the donut draws with (FILLS in DonutCanvas.jsx) — the
 * old `panel-dot*` colours disagreed with the arcs they captioned.
 */
const DOTS = {
  present: 'bg-chart-indigo',
  late: 'bg-chart-marigold',
  onLeave: 'bg-chart-teal',
  notIn: 'bg-chart-slate',
};

/**
 * WorkforcePanel — the prototype's `.panel-lavender` spanning column
 * (SWAMS_Unified.html: the tall right-hand panel beside the KPI grid). It is
 * the one filled surface in the composition, which is why it carries a
 * dedicated `panel-*` token set rather than a card background.
 *
 * The donut is the company board the server actually returned — present,
 * late, on leave, not in — and every segment is repeated as a number
 * underneath, so the chart is never the only source (Section 8.9). Each
 * legend swatch is drawn from the donut's own palette (FILLS in
 * DonutCanvas.jsx) so colour maps one-to-one between arc and caption, and
 * the header pairs the title with the server's "X of Y in today" line
 * (`workforce.expected`). An org where nobody has clocked in gets a worded
 * empty state instead of a ring of zeroes.
 *
 * It reads `GET /org/dashboard`, the same payload the KPI row above it reads,
 * so the tiles and the donut can never state different numbers. The separate
 * team board (`GET /attendance/team`) is the /attendance/team page's source and
 * describes the reviewer's own team, not the company.
 */
export function WorkforcePanel() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="workforce-heading"
        className="border-panel-border bg-panel text-panel-text flex h-full flex-col rounded-card border p-5"
      >
        <h2
          id="workforce-heading"
          className="font-display text-panel-text/70 text-xs font-semibold tracking-wide uppercase"
        >
          {t('workforce.title')}
        </h2>
        <Skeleton block className="mt-1.5 h-4 w-44 rounded-pill" />
        <div className="flex flex-1 items-center py-4">
          <Skeleton block className="h-44 w-full rounded-card" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 border-t border-panel-border pt-4">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} block className="h-16 rounded-input" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const s = board?.presence ?? { present: 0, late: 0, onLeave: 0, notIn: 0, expected: 0 };
  // Payload key → label key. The catalog spells these `in` / `leave`, so the
  // mapping keeps the panel on the same words the rest of the app uses
  // (`presence.present` used to render as a raw key on screen).
  const LEGEND = [
    { key: 'present', labelKey: 'presence.in', value: s.present },
    { key: 'late', labelKey: 'presence.late', value: s.late },
    { key: 'onLeave', labelKey: 'presence.leave', value: s.onLeave },
    { key: 'notIn', labelKey: 'presence.out', value: s.notIn },
  ];
  const segments = LEGEND.filter((seg) => seg.value > 0);

  return (
    <section
      aria-labelledby="workforce-heading"
      className="border-panel-border bg-panel text-panel-text flex h-full flex-col rounded-card border p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="workforce-heading"
          className="font-display text-panel-text/70 text-xs font-semibold tracking-wide uppercase"
        >
          {t('workforce.title')}
        </h2>
        <p className="text-panel-text text-xs font-semibold tabular">
          {t('workforce.expected', { present: s.present, expected: s.expected })}
        </p>
      </div>

      {segments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <p className="text-panel-text font-semibold">{t('workforce.emptyTitle')}</p>
          <p className="text-panel-text/70 mt-1 text-xs">{t('workforce.emptyBody')}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-1 items-center">
            <div className="h-44 w-full" aria-hidden="true">
              <Suspense fallback={<Skeleton block className="h-44 rounded-card" />}>
                <DonutCanvas segments={segments} total={s.expected} caption={t('kpi.totalEmployees')} />
              </Suspense>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2.5 border-t border-panel-border pt-4">
            {LEGEND.map((item) => (
              <div
                key={item.key}
                className="border-panel-border/70 bg-surface/60 rounded-input border px-3 py-2.5"
              >
                <dt className="text-panel-text/75 flex items-center gap-1.5 text-xs font-medium">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-pill ${DOTS[item.key]}`}
                  />
                  {t(item.labelKey)}
                </dt>
                <dd className="text-panel-text mt-1 text-xl font-bold leading-none tabular">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
