import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { can } from '@swams/permissions';
import { Button, EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { useSession } from '../../../hooks/useSession.js';
import { useAttendanceHistory } from '../hooks/useAttendance.js';
import { PunchHistoryRow } from '../components/PunchHistoryRow.jsx';

/**
 * `/attendance/history` — paged attendance days (§10.4). Renders loading,
 * empty and error before the happy path, and stays a list (not a table) on
 * mobile so nothing scrolls sideways.
 */
export function HistoryPage() {
  const { t } = useTranslation('attendance');
  const { principal } = useSession();
  const canReview = can(principal, 'attendance.approve');
  const { rows, isLoading, isFetchingMore, error, refetch, hasMore, fetchMore } =
    useAttendanceHistory();

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl">{t('history')}</h1>
        <nav className="flex flex-wrap items-baseline gap-3 text-sm font-medium">
          {canReview ? (
            <Link className="text-primary underline" to="/attendance/team">
              {t('team.title')}
            </Link>
          ) : null}
          <Link className="text-primary underline" to="/attendance">
            {t('today')}
          </Link>
          <Link className="text-primary underline" to="/attendance/corrections">
            {t('corrections.open')}
          </Link>
        </nav>
      </header>

      {isLoading ? (
        <div className="grid gap-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="rounded-card h-12" />
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />
      ) : null}

      {!isLoading && !error && rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays aria-hidden="true" size={20} strokeWidth={1.75} />}
          title={t('empty.title')}
          body={t('empty.body')}
          action={
            <Link className="text-primary text-sm font-medium underline" to="/attendance">
              {t('title')}
            </Link>
          }
        />
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <>
          <p className="text-text-muted text-sm">
            {t('calendar.title')}
            {': '}
            <Link className="text-primary font-medium underline" to="/attendance">
              {t('today')}
            </Link>
          </p>
          <div
            aria-hidden="true"
            className="text-text-faint hidden grid-cols-[1fr_repeat(4,minmax(0,6rem))] gap-x-4 px-4 text-xs font-medium md:grid"
          >
            <span>{t('column.date')}</span>
            <span>{t('column.in')}</span>
            <span>{t('column.out')}</span>
            <span>{t('column.worked')}</span>
            <span>{t('column.status')}</span>
          </div>
          <ul
            aria-label={t('history')}
            className="bg-surface border-border divide-y divide-border rounded-card border"
          >
            {rows.map((row) => (
              <PunchHistoryRow key={row.id} row={row} />
            ))}
          </ul>
          {hasMore ? (
            <div className="justify-self-center">
              <Button variant="secondary" loading={isFetchingMore} onClick={() => fetchMore()}>
                {t('loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
