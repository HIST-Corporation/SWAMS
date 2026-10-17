import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle, ErrorState, Skeleton } from '@swams/ui';
import { formatPercent } from '@swams/i18n';
import { useOrgDashboard } from '../hooks/useDashboard.js';

/** Section 5A/8.11: Recharts arrives in its own chunk, after the shell. */
const OrgTrendCanvas = lazy(() =>
  import('./OrgTrendCanvas.jsx').then((module) => ({ default: module.OrgTrendCanvas })),
);

/** Short weekday name in the active UI language, pinned to UTC (Section 5A.4). */
function weekdayLabel(date, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

/**
 * OrgTrendChart — the prototype's "Weekly Attendance Trend" panel
 * (`SWAMS_Unified.html`, `#dash-line-chart`): the company's daily attendance
 * rate, against the target line the org is measured on.
 *
 * The prototype drew it as a bare SVG with two raw hex greens; here the line
 * and the target come from tokens so both themes clear the 3:1 rule for
 * graphical objects (9.3), the same numbers ship as a real table for screen
 * readers and print (8.9), and the target is labelled in words rather than
 * carried by the dash pattern alone.
 */
export function OrgTrendChart() {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="org-trend-heading">
        <CardTitle id="org-trend-heading">{t('trend.title')}</CardTitle>
        <Skeleton block className="h-56 rounded-input" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const points = board?.trend?.points ?? [];
  const target = board?.trend?.target ?? null;
  const rows = points.map((point) => ({
    ...point,
    label: weekdayLabel(point.date, locale),
  }));

  return (
    <Card aria-labelledby="org-trend-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle id="org-trend-heading" className="mb-0">
          {t('trend.title')}
        </CardTitle>
        {target !== null ? (
          <p className="tabular text-text-faint text-xs">
            {t('trend.target', { value: formatPercent(target, { digits: 0 }) })}
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 text-sm">
          <p className="text-text">{t('trend.emptyTitle')}</p>
          <p className="text-text-faint mt-1">{t('trend.emptyBody')}</p>
        </div>
      ) : (
        <figure className="mt-3">
          <div className="h-56 w-full" aria-hidden="true">
            <Suspense fallback={<Skeleton block className="h-56 rounded-input" />}>
              <OrgTrendCanvas data={rows} target={target} targetLabel={t('trend.targetLabel')} />
            </Suspense>
          </div>
          <TrendTable rows={rows} />
        </figure>
      )}
    </Card>
  );
}

/**
 * The chart is a picture; this is the same data as a table. Section 8.9: no
 * information is carried by shape alone, and print/PDF users get real values.
 */
function TrendTable({ rows }) {
  const { t } = useTranslation('dashboard');

  return (
    <table className="sr-only">
      <caption>{t('trend.tableCaption')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('trend.colDay')}</th>
          <th scope="col">{t('trend.colRate')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.date}>
            <th scope="row">{row.label}</th>
            <td>{formatPercent(row.rate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
