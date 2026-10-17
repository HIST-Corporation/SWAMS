import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ErrorState, IconButton, Skeleton } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';
import { useAttendanceMonth } from '../hooks/useAttendance.js';

/** Status id → cell tint. The status word always travels with the colour (§8.9). */
const TINT = {
  present: 'bg-success-soft text-success-text',
  late: 'bg-warning-soft text-warning-text',
  absent: 'bg-danger-soft text-danger-text',
  half_day: 'bg-warning-soft text-warning-text',
  leave: 'bg-info-soft text-info-text',
  holiday: 'bg-surface-sunken text-text-muted',
};

/** Legend order — the statuses a person can meet in a month. */
const LEGEND = ['present', 'late', 'absent', 'leave', 'holiday'];

/** Short weekday names, Sunday first, in the visitor's locale. */
function weekdayNames(locale) {
  const sunday = new Date(Date.UTC(2023, 0, 1)); // a Sunday
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(sunday.getTime() + index * 86_400_000)),
  );
}

/** `YYYY-MM` → a `Date` pinned to UTC so Nepal's calendar never shifts. */
function monthDate(month) {
  return new Date(`${month}-01T00:00:00.000Z`);
}

function shiftMonth(month, delta) {
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

/** Weekday index (0 = Sunday) of the first day of the month. */
function firstWeekday(month) {
  return monthDate(month).getUTCDay();
}

/**
 * Month calendar (§9.9): one month of day statuses under the punch card, so a
 * person sees present / absent / late / leave at a glance without leaving the
 * page. Every day is the server's own status for that date (§7.6); days that
 * have not happened yet draw as upcoming, never as an invented status.
 *
 * Colour never carries the meaning alone: each cell's accessible name reads
 * the date and the status word, and the legend spells every tint out (§8.9).
 *
 * @param {{ now?: Date }} props
 */
export function MonthCalendar({ now = new Date() }) {
  const { t, i18n } = useTranslation('attendance');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const [month, setMonth] = useState(() => now.toISOString().slice(0, 7));
  const { isLoading, error, refetch, days } = useAttendanceMonth({ month });

  const names = weekdayNames(locale);
  const label = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthDate(month));

  return (
    <section
      aria-labelledby="month-calendar-heading"
      className="bg-surface border-border rounded-card border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="month-calendar-heading" className="text-md">
          {t('calendar.title')}
        </h2>
        <div className="flex items-center gap-1">
          <IconButton
            label={t('calendar.prevMonth')}
            className="h-9 w-9"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
          >
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          </IconButton>
          <span aria-live="polite" className="tabular min-w-32 text-center text-sm font-medium">
            {label}
          </span>
          <IconButton
            label={t('calendar.nextMonth')}
            className="h-9 w-9"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
          >
            <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      {isLoading ? <Skeleton className="mt-3 h-56 w-full rounded-input" /> : null}

      {error ? (
        <div className="mt-3">
          <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          <ul aria-hidden="true" className="mt-3 grid grid-cols-7 gap-1.5 text-center">
            {names.map((name) => (
              <li key={name} className="text-text-faint text-xs font-medium">
                {name}
              </li>
            ))}
          </ul>

          <ol aria-label={t('calendar.title')} className="mt-1 grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday(month) }, (_, index) => (
              <li key={`pad-${index}`} aria-hidden="true" />
            ))}
            {days.map((day) => {
              const status = day.status;
              const date = new Date(`${day.date}T12:00:00.000Z`);
              const statusWord = status ? t(`status.${status}`) : t('calendar.upcoming');
              const spoken = t('calendar.dayLabel', {
                date: formatDateAd(date, { locale }),
                status: statusWord,
              });
              return (
                <li key={day.date}>
                  <span
                    title={spoken}
                    className={`flex aspect-square flex-col items-center justify-center rounded-input text-xs font-medium ${
                      status
                        ? (TINT[status] ?? 'bg-surface-sunken text-text-muted')
                        : 'text-text-faint'
                    }`}
                  >
                    <span aria-hidden="true" className="tabular">
                      {date.getUTCDate()}
                    </span>
                    <span className="sr-only">{spoken}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div
            aria-label={t('calendar.legend')}
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5"
          >
            {LEGEND.map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-pill ${TINT[status].split(' ')[0]}`}
                />
                <span className="text-text-muted">{t(`status.${status}`)}</span>
              </span>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
