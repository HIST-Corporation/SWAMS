import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardTitle,
  EmptyState,
  ErrorState,
  PreviewNotice,
  Skeleton,
  StatTile,
} from '@swams/ui';
import { formatDuration, formatPercent } from '@swams/i18n';
import { useAnalytics } from '../hooks/useReports.js';

/** Section 5A/8.11: Recharts arrives in its own chunk, after the shell. */
const AnalyticsTrendCanvas = lazy(() =>
  import('./AnalyticsTrendCanvas.jsx').then((module) => ({
    default: module.AnalyticsTrendCanvas,
  })),
);

const AnalyticsBarsCanvas = lazy(() =>
  import('./AnalyticsBarsCanvas.jsx').then((module) => ({
    default: module.AnalyticsBarsCanvas,
  })),
);

export const PERIODS = ['week', 'month', 'year'];

/** Day-status breakdown colours — words beside them in every row (§8.9). */
const DIST = {
  present: 'bg-success',
  late: 'bg-warning',
  absent: 'bg-danger',
  leave: 'bg-info',
};

/** Bucket date → chart label: weekday, day number, or month name (§5A.4). */
export function bucketLabel(date, period, locale) {
  const day = new Date(`${date}T00:00:00.000Z`);
  if (period === 'year') {
    return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(day);
  }
  if (period === 'month') {
    return String(day.getUTCDate());
  }
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(day);
}

/**
 * `/analytics` body — week / month / year progress (§12 insights analytics).
 * One payload owns the tiles, the two charts and the breakdown, so the four
 * can never state different numbers (§7.6); the charts are pictures, and the
 * same numbers ship as a table for screen readers and print (§8.9).
 *
 * @param {{ period: string }} props
 */
export function AnalyticsPanel({ period }) {
  const { t, i18n } = useTranslation('reports');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const analytics = useAnalytics({ period });

  if (analytics.isLoading) {
    return <Skeleton block className="h-80 rounded-card" aria-busy="true" />;
  }

  if (analytics.error) {
    return (
      <ErrorState
        message={analytics.error.message || t('loadError')}
        requestId={analytics.error.requestId}
        onRetry={analytics.refetch}
      />
    );
  }

  if (!analytics.data || analytics.data.points.length === 0) {
    return <EmptyState title={t('analytics.emptyTitle')} body={t('analytics.emptyBody')} />;
  }

  const { summary, breakdown } = analytics.data;
  const rows = analytics.data.points.map((point) => ({
    ...point,
    label: bucketLabel(point.date, period, locale),
  }));
  const dayTotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          tone="brand"
          label={t('analytics.kpi.rate')}
          value={formatPercent(summary.rate)}
        />
        <StatTile label={t('analytics.kpi.hours')} value={formatDuration(summary.workedMinutes)} />
        <StatTile label={t('analytics.kpi.present')} value={String(summary.presentDays)} />
        <StatTile label={t('analytics.kpi.late')} value={String(summary.lateDays)} />
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <Card aria-labelledby="analytics-trend-heading">
          <CardTitle id="analytics-trend-heading">{t('analytics.trendTitle')}</CardTitle>
          <figure>
            <div className="h-56 w-full" aria-hidden="true">
              <Suspense fallback={<Skeleton block className="h-56 rounded-input" />}>
                <AnalyticsTrendCanvas data={rows} />
              </Suspense>
            </div>
            <AnalyticsTable rows={rows} captionKey="analytics.trendTable" />
          </figure>
        </Card>

        <Card aria-labelledby="analytics-hours-heading">
          <CardTitle id="analytics-hours-heading">{t('analytics.hoursTitle')}</CardTitle>
          <figure>
            <div className="h-56 w-full" aria-hidden="true">
              <Suspense fallback={<Skeleton block className="h-56 rounded-input" />}>
                <AnalyticsBarsCanvas data={rows} />
              </Suspense>
            </div>
            <AnalyticsTable rows={rows} captionKey="analytics.hoursTable" />
          </figure>
        </Card>
      </div>

      <Card aria-labelledby="analytics-breakdown-heading">
        <CardTitle id="analytics-breakdown-heading">{t('analytics.breakdownTitle')}</CardTitle>
        <ul className="grid gap-2.5">
          {Object.entries(breakdown).map(([status, days]) => (
            <li key={status} className="grid gap-1">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-text">
                  {t(`columns.${status === 'leave' ? 'onLeave' : status}`)}
                </span>
                <span className="tabular text-text-muted">{days}</span>
              </span>
              <span
                aria-hidden="true"
                className="bg-surface-sunken flex h-2 overflow-hidden rounded-pill"
              >
                <span
                  className={`block rounded-pill ${DIST[status] ?? 'bg-text-faint'}`}
                  style={{ width: `${dayTotal > 0 ? Math.round((days / dayTotal) * 100) : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <PreviewNotice badgeKey="home.sampleBadge" bodyKey="home.sampleBody" />
    </div>
  );
}

/** The charts are pictures; this is the same data as a table (§8.9). */
function AnalyticsTable({ rows, captionKey }) {
  const { t } = useTranslation('reports');

  return (
    <table className="sr-only">
      <caption>{t(captionKey)}</caption>
      <thead>
        <tr>
          <th scope="col">{t('analytics.colBucket')}</th>
          <th scope="col">{t('analytics.colRate')}</th>
          <th scope="col">{t('analytics.colHours')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.date}>
            <th scope="row">{row.label}</th>
            <td>{row.rate != null ? formatPercent(row.rate) : t('analytics.none')}</td>
            <td>{row.minutes != null ? formatDuration(row.minutes) : t('analytics.none')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
