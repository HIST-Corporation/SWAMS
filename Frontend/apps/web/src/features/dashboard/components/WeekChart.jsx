import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle, ErrorState, Skeleton } from '@swams/ui';
import { formatDuration } from '@swams/i18n';
import { useAttendanceHistory } from '../../attendance/index.js';
import { HISTORY_WINDOW, weekSeries } from '../weekStats.js';

/** Section 5A/8.11: Recharts arrives in its own chunk, after the shell. */
const WeekChartCanvas = lazy(() =>
  import('./WeekChartCanvas.jsx').then((module) => ({
    default: module.WeekChartCanvas,
  })),
);

/** Short weekday name in the active UI language, pinned to UTC (Section 5A.4). */
function weekdayLabel(date, locale) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

/**
 * WeekChart — the reference's "Sales report" panel, retargeted at what this
 * product actually knows: hours you recorded this week, one bar per day
 * (README "Rebuild notes", §5A).
 *
 * Design constraints honoured here: Recharts is lazy (5A/8.11), all chart
 * colour comes from tokens so light and dark both work (9.3), an unrecorded
 * day renders as an empty gap rather than a zero bar because 9.7 bans
 * fabricating a `0h` day, and the same numbers ship as a real `<table>` for
 * screen readers and print (8.9).
 */
export function WeekChart() {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const history = useAttendanceHistory({ perPage: HISTORY_WINDOW });

  if (history.isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="week-chart-heading">
        <CardTitle id="week-chart-heading">{t('chart.title')}</CardTitle>
        <Skeleton block className="h-56 rounded-input" />
      </Card>
    );
  }

  if (history.error) {
    return (
      <ErrorState
        message={history.error.message}
        requestId={history.error.requestId}
        onRetry={history.refetch}
      />
    );
  }

  const rows = weekSeries(history.rows).map((row) => ({
    ...row,
    label: weekdayLabel(row.date, locale),
  }));
  const recorded = rows.filter((row) => row.minutes > 0);
  const total = rows.reduce((sum, row) => sum + row.minutes, 0);

  return (
    <Card aria-labelledby="week-chart-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle id="week-chart-heading" className="mb-0">
          {t('chart.title')}
        </CardTitle>
        {recorded.length > 0 ? (
          <p className="tabular text-text-faint text-xs">
            {t('chart.total', { value: formatDuration(total) })}
          </p>
        ) : null}
      </div>

      {recorded.length === 0 ? (
        <div className="mt-3 text-sm">
          <p className="text-text">{t('chart.emptyTitle')}</p>
          <p className="text-text-faint mt-1">{t('chart.emptyBody')}</p>
        </div>
      ) : (
        <figure className="mt-3">
          <div className="h-56 w-full" aria-hidden="true">
            <Suspense fallback={<Skeleton block className="h-56 rounded-input" />}>
              <WeekChartCanvas data={rows} />
            </Suspense>
          </div>
          <ChartTable rows={rows} />
        </figure>
      )}
    </Card>
  );
}

/**
 * The chart is a picture; this is the same data as a table. Section 8.9: no
 * information is carried by shape alone, and print/PDF users get real values.
 */
function ChartTable({ rows }) {
  const { t } = useTranslation('dashboard');

  return (
    <table className="sr-only">
      <caption>{t('chart.tableCaption')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('chart.colDay')}</th>
          <th scope="col">{t('chart.colHours')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.date}>
            <th scope="row">{row.label}</th>
            <td>{row.minutes > 0 ? formatDuration(row.minutes) : t('chart.none')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
