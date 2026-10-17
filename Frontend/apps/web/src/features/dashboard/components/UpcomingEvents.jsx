import { useTranslation } from 'react-i18next';
import { CalendarDays, CalendarOff, PartyPopper } from 'lucide-react';
import { ErrorState, Skeleton } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';
import { useUpcoming } from '../hooks/useDashboard.js';

/**
 * Event kind → tint + glyph. The label under each row names the kind in words
 * (Section 8.9: colour and icon never carry meaning alone).
 */
const KIND = {
  meeting: { tone: 'bg-chip-indigo text-chip-indigo-fg', Icon: CalendarDays },
  leave: { tone: 'bg-chip-violet text-chip-violet-fg', Icon: CalendarOff },
  holiday: { tone: 'bg-chip-marigold text-chip-marigold-fg', Icon: PartyPopper },
};

/**
 * ComingUp — the tinted events rail that closes a reviewer's Home (reference:
 * the workforce board's "Feature Events" panel). Each row is one meeting,
 * leave block or holiday ahead, tinted by kind. The rail answers "what's
 * next?" without opening a calendar.
 */
export function UpcomingEvents({ bare = false }) {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const events = useUpcoming();

  if (events.isLoading) {
    return (
      <section aria-busy="true" className="grid gap-2.5">
        {bare ? null : <Skeleton className="h-5 w-32" />}
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} block className="h-16 rounded-card" />
        ))}
      </section>
    );
  }

  if (events.error) {
    return (
      <ErrorState
        message={events.error.message}
        requestId={events.error.requestId}
        onRetry={events.refetch}
      />
    );
  }

  return (
    <section
      aria-labelledby={bare ? undefined : 'events-heading'}
      className={bare ? 'contents' : 'grid gap-2.5'}
    >
      {bare ? null : (
        <h2 id="events-heading" className="text-text font-display text-md">
          {t('events.title')}
        </h2>
      )}

      {events.rows.length === 0 ? (
        <div className="text-text-faint rounded-input border-border border px-4 py-5 text-sm">
          <p className="text-text">{t('events.emptyTitle')}</p>
          <p className="mt-1">{t('events.emptyBody')}</p>
        </div>
      ) : (
        <ul className="grid gap-2.5">
          {events.rows.map((event) => {
            const { tone, Icon } = KIND[event.kind] ?? KIND.meeting;
            return (
              <li
                key={event.id}
                className="bg-surface-sunken flex items-center gap-3 rounded-input px-3.5 py-3"
              >
                <span
                  aria-hidden="true"
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-input ${tone}`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-text-faint text-xs">
                    {t(`events.kind.${event.kind}`)}
                    {event.date
                      ? ` · ${formatDateAd(new Date(`${event.date}T12:00:00.000Z`), { locale })}`
                      : ''}
                    {event.when ? ` · ${event.when}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
