import { useTranslation } from 'react-i18next';
import { ErrorState, Skeleton } from '@swams/ui';
import { formatDuration } from '@swams/i18n';
import { useWeekStrip } from '../hooks/useAttendance.js';

/** Short weekday names, Sunday first, in the visitor's locale. */
function weekdayNames(locale) {
  const sunday = new Date(Date.UTC(2023, 0, 1)); // a Sunday
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(sunday.getTime() + index * 86_400_000)),
  );
}

/**
 * Week strip (§9.9): the seven days of the current Nepal week under the punch
 * card, so a person sees how the week is going without leaving the page.
 *
 * States before the happy path (§8.5): while the query is in flight the strip
 * is a skeleton, and if it fails the strip says so and offers a retry rather
 * than showing a week that never happened.
 *
 * Every day is a label plus its own value in words — the bar only re-states
 * the number beside it, never carries meaning alone (§8.9). A day the server
 * gave no minutes for is drawn as a real zero, never smoothed over. The totals
 * are the server's own arithmetic over the same history rows, so the strip and
 * the history table can never disagree about a day (§7.6).
 *
 * @param {{ now?: Date }} props
 */
export function WeekStrip({ now = new Date() }) {
  const { t, i18n } = useTranslation('attendance');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const week = useWeekStrip({ now });

  if (week.isLoading) {
    return <Skeleton className="h-24 w-full rounded-card" />;
  }

  if (week.error) {
    return (
      <ErrorState
        message={week.error.message}
        requestId={week.error.requestId}
        onRetry={week.refetch}
      />
    );
  }

  const names = weekdayNames(locale);
  const expected = 480; // the scheduled day the org's policy states
  const peak = Math.max(expected, ...week.days.map((day) => day.minutes));

  return (
    <section
      aria-labelledby="week-heading"
      className="bg-surface border-border rounded-card border p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-heading" className="text-md">
          {t('summary.title')}
        </h2>
        <p className="text-text-muted text-sm">
          <span className="tabular">{formatDuration(week.minutes)}</span>
          {' · '}
          {t('summary.days', { count: week.workedDays })}
          {week.elapsed > 1 ? (
            <>
              {' · '}
              {t('summary.elapsed', { count: week.elapsed })}
            </>
          ) : null}
        </p>
      </div>

      <ul className="mt-3 grid grid-cols-7 gap-1.5">
        {week.days.map((day, index) => {
          const ratio = peak === 0 ? 0 : Math.max(0.04, day.minutes / peak);
          return (
            <li key={day.date} className="grid gap-1 text-center">
              <span className="text-text-faint text-xs">{names[index]}</span>
              <span
                aria-hidden="true"
                className="bg-surface-sunken flex h-14 items-end overflow-hidden rounded-input"
              >
                <span
                  className="bg-primary block w-full rounded-input"
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                />
              </span>
              <span className="tabular text-xs">
                {day.minutes > 0 ? formatDuration(day.minutes) : t('summary.noTime')}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-text-faint mt-2 text-xs">
        {t('summary.expected', { expected: formatDuration(expected * week.elapsed) })}
      </p>
    </section>
  );
}
