import { useTranslation } from 'react-i18next';
import { Card, CardTitle, ErrorState, Skeleton } from '@swams/ui';
import { formatPercent } from '@swams/i18n';
import { useOrgDashboard } from '../hooks/useDashboard.js';

/**
 * Literal class names so Tailwind's content scan generates them. The tone
 * arrives with the row (org data), which keeps the department order the
 * server's rather than something the client invents.
 */
const FILLS = {
  indigo: 'bg-chart-indigo',
  violet: 'bg-chart-violet',
  teal: 'bg-chart-teal',
  marigold: 'bg-chart-marigold',
  rose: 'bg-chart-rose',
};

/**
 * DepartmentBars — the prototype's "Department Attendance" panel
 * (`SWAMS_Unified.html`, `#dept-bars`): one labelled progress bar per
 * department.
 *
 * The prototype tinted each bar by department and printed the percentage in the
 * same colour, so the figure and the bar repeated one signal. Here the label
 * and the percentage are real text at either end of the row (8.9: the bar is
 * decoration, the number is the meaning) and the bar itself is `aria-hidden`,
 * because a screen reader gets nothing from a 6px coloured strip.
 */
export function DepartmentBars() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="dept-heading">
        <CardTitle id="dept-heading">{t('dept.title')}</CardTitle>
        <div className="grid gap-3">
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-8" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const rows = board?.departments ?? [];

  return (
    <Card aria-labelledby="dept-heading">
      <CardTitle id="dept-heading">{t('dept.title')}</CardTitle>

      {rows.length === 0 ? (
        <div className="text-sm">
          <p className="text-text">{t('dept.emptyTitle')}</p>
          <p className="text-text-faint mt-1">{t('dept.emptyBody')}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-text-muted">{row.name}</span>
                <span className="tabular font-semibold">{formatPercent(row.rate)}</span>
              </div>
              <div
                aria-hidden="true"
                className="bg-surface-sunken rounded-pill mt-1.5 h-1.5 w-full overflow-hidden"
              >
                <div
                  className={`rounded-pill h-full ${FILLS[row.tone] ?? FILLS.indigo}`}
                  style={{ width: `${Math.max(0, Math.min(100, row.rate))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
