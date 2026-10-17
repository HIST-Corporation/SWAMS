import { Badge } from '@swams/ui';

/** Kind → badge tone; the word is always the kind's text (§8.9). */
const KIND_TONE = { leave: 'info', holiday: 'danger', meeting: 'primary' };

/**
 * The whole month as a list: every day that has something booked, in words.
 * This is the screen a 360px phone actually reads — the grid answers "where",
 * this answers "what happens next". Picking a day here selects it in the grid
 * too, so the two never drift.
 *
 * @param {{ t: Function, days: object[], selected: string, filtered: boolean, formatDay: (iso: string) => string, onSelect: (iso: string) => void }} props
 */
export function MonthAgenda({ t, days, selected, filtered = false, formatDay, onSelect }) {
  if (days.length === 0) {
    return (
      <section aria-labelledby="calendar-agenda-heading" className="grid gap-3">
        <h2 id="calendar-agenda-heading" className="text-md">
          {t('agenda.title')}
        </h2>
        <p className="text-text-faint text-sm">
          {filtered ? t('agenda.filteredEmpty') : t('monthEmpty')}
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="calendar-agenda-heading" className="grid gap-3">
      <h2 id="calendar-agenda-heading" className="text-md">
        {t('agenda.title')}
      </h2>
      <ul className="grid gap-2">
        {days.map((day) => (
          <li
            key={day.date}
            className={`bg-surface grid gap-1.5 rounded-card border px-4 py-3 ${
              selected === day.date ? 'border-primary' : 'border-border'
            }`}
          >
            <button
              type="button"
              aria-pressed={selected === day.date}
              onClick={() => onSelect(day.date)}
              className="text-text focus-visible:ring-primary rounded-input w-fit text-left text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2"
            >
              {formatDay(day.date)}
            </button>
            <ul className="grid gap-1">
              {day.events.map((event, index) => (
                <li key={`${event.kind}-${index}`} className="flex items-center gap-2 text-sm">
                  <Badge tone={KIND_TONE[event.kind] ?? 'neutral'}>{t(`kind.${event.kind}`)}</Badge>
                  <span className="min-w-0">{event.title}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
