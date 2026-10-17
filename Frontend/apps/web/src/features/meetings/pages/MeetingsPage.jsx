import { useTranslation } from 'react-i18next';
import { Button, PreviewNotice } from '@swams/ui';
import { nepalParts } from '@swams/i18n';
import { UPCOMING } from '../mocks/fixtures.js';

/**
 * `/meetings` — schedule and upcoming list (screen inventory R2). SAMPLE DATA:
 * no meeting endpoint exists yet, so the calendar is illustrative, the list is
 * a fixture, and the schedule button is honestly disabled (§12.1). The month
 * and today's marker come from the real Nepal wall clock so the page never
 * claims a date that isn't today.
 */
export function MeetingsPage() {
  const { t, i18n } = useTranslation('meetings');
  const { t: tn } = useTranslation('nav');
  const weekdays = t('weekdays', { returnObjects: true });
  const { year, month, day } = nepalParts(new Date());
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl">{tn('meetings')}</h1>
          <p className="text-text-muted mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <Button size="sm" disabled>
          {t('schedule')}
        </Button>
      </header>

      <PreviewNotice />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border-border bg-surface rounded-card border p-6">
          <h2 className="text-text-muted mb-4 text-sm font-semibold">{monthLabel}</h2>
          <div className="text-text-muted grid grid-cols-7 gap-1 text-center text-xs">
            {weekdays.map((day) => (
              <div key={day} className="p-1">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => {
              const number = (i % 31) + 1;
              const isToday = number === day;
              return (
                <div
                  key={i}
                  className={`flex aspect-square items-center justify-center rounded text-xs transition hover:bg-surface-sunken ${
                    // Exclusive branches on purpose: two colour classes of equal
                    // specificity are decided by stylesheet order, so `isToday`
                    // adding a class to the muted one left muted ink on a blue
                    // fill (1.26:1) instead of white on it.
                    isToday ? 'bg-primary text-on-primary font-medium' : 'text-text-muted'
                  }`}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {number > 0 && number <= 31 ? number : ''}
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-border bg-surface rounded-card border p-6">
          <h2 className="text-text-muted mb-4 text-sm font-semibold">{t('upcoming')}</h2>
          <ul className="grid gap-3">
            {UPCOMING.map((meeting) => (
              <li
                key={meeting.id}
                className="bg-surface-sunken flex items-center gap-4 rounded-input p-3"
              >
                <span className={`h-10 w-1 rounded-full ${meeting.color}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{meeting.title}</span>
                  <span className="text-text-muted block text-xs">
                    {t('meta', { time: meeting.time, dept: t(`dept.${meeting.deptKey}`) })}
                  </span>
                </span>
                <span className="bg-primary-soft text-primary rounded-pill px-2 py-0.5 text-xs">
                  {t('soon')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
