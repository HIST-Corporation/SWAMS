/** Kind → dot colour; the word is always the kind's text (§8.9). */
const KIND_DOT = {
  leave: 'bg-info',
  holiday: 'bg-danger',
  meeting: 'bg-primary',
};

/** One day of the grid: it answers the arrow keys itself (so the container never
 * needs focus) and its accessible name spells out everything the hints suggest.
 *
 * The cell body wears the tint of what the day holds — holiday first, then
 * meetings, then leave — as a soft fill under a saturated top edge, so the
 * colour still reads in dark mode where the soft tokens sit near the
 * background. Ordinary working days stay crisp surface cards, the weekly off
 * sits sunken beneath them, and today wears a filled circle on its number.
 * Colour never works alone: the accessible name spells every tint out in
 * words (§8.9).
 */
export function DayCell({
  t,
  iso,
  events,
  selected,
  tabbable,
  isToday,
  isWeeklyOff,
  formatDay,
  onSelect,
  onKeyDown,
}) {
  const dayNumber = Number(iso.slice(8, 10));
  const date = formatDay(iso);
  const weeklyOff = isWeeklyOff ? `${t('weeklyOff')}.` : '';
  // The dominant tint wins, in the order a reader asks about a day: holidays
  // close the office, then meetings decide it, then leave. Each tint pairs its
  // soft fill with a saturated top edge (a light-mode pastel alone turns to
  // mud against the dark background); an ordinary working day keeps a crisp
  // surface card, and the weekly off stays sunken.
  const kindsPresent = (events ?? []).map((event) => event.kind);
  const kind = kindsPresent.includes('holiday')
    ? 'holiday'
    : kindsPresent.includes('meeting')
      ? 'meeting'
      : kindsPresent.includes('leave')
        ? 'leave'
        : null;
  const dayTint = selected
    ? 'border-primary bg-primary-soft ring-1 ring-primary'
    : kind === 'holiday'
      ? 'border-danger/40 border-t-2 border-t-danger bg-danger-soft hover:border-danger/60'
      : kind === 'meeting'
        ? 'border-primary/40 border-t-2 border-t-primary bg-primary-soft hover:border-primary/60'
        : kind === 'leave'
          ? 'border-info/40 border-t-2 border-t-info bg-info-soft hover:border-info/60'
          : isWeeklyOff
            ? 'border-border bg-surface-sunken hover:border-border-strong'
            : 'border-border bg-surface hover:border-border-strong hover:bg-surface-sunken';
  const label =
    events.length === 0
      ? `${date}. ${weeklyOff} ${t('noEventsDay')}`
      : `${date}. ${weeklyOff} ${t('eventsCount', { count: events.length })}: ${events
          .map((event) => event.title)
          .join(', ')}.`;

  return (
    <button
      type="button"
      data-iso={iso}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onSelect(iso)}
      onKeyDown={(event) => onKeyDown(iso, event)}
      aria-label={label}
      aria-current={isToday ? 'date' : undefined}
      className={`focus-visible:ring-primary flex min-h-14 w-full flex-col items-center justify-start gap-1 rounded-input border px-1 py-1.5 focus-visible:outline-none focus-visible:ring-2 md:min-h-24 md:items-stretch md:px-2 ${dayTint}`}
    >
      <span
        className={`tabular flex h-7 w-7 items-center justify-center rounded-pill text-sm font-semibold ${
          isToday ? 'bg-primary text-on-primary' : isWeeklyOff ? 'text-text-muted' : 'text-text'
        }`}
      >
        {dayNumber}
      </span>
      {/*
       * Two hint shapes for two cell shapes: at 42–92px only dots fit, from lg
       * up the cell names its first event and counts the rest (below that a
       * title truncates to "Wee…", which is noise). Both are decorative — the
       * cell's accessible name already spells every event out.
       */}
      <span aria-hidden="true" className="flex items-center gap-1 lg:hidden">
        {events.slice(0, 3).map((event, index) => (
          <span key={index} className={`h-1.5 w-1.5 rounded-pill ${KIND_DOT[event.kind]}`} />
        ))}
      </span>
      <span aria-hidden="true" className="hidden min-w-0 items-center gap-1 lg:flex">
        {events.length > 0 ? (
          <>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-pill ${KIND_DOT[events[0].kind]}`} />
            <span className="text-text truncate text-xs">{events[0].title}</span>
            {events.length > 1 ? (
              <span className="text-text-muted tabular shrink-0 text-xs">
                {t('moreEvents', { count: events.length - 1 })}
              </span>
            ) : null}
          </>
        ) : null}
      </span>
    </button>
  );
}