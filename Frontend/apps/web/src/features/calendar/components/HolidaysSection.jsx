import { Badge } from '@swams/ui';

/**
 * This month's public holidays, scoped by where the institution is — a Nepal
 * table-stake (Section 3) and the section the owner asked for. National
 * holidays always apply; a regional holiday applies only when its province
 * matches the org's location, so other provinces sit collapsed and labelled
 * instead of being mixed into "your" list. Every date is a button: tapping it
 * selects that day in the grid, so the section and the calendar stay one UI.
 *
 * Sample data until the public-holiday endpoint exists (contract request 27);
 * the section says so itself rather than passing as production behavior.
 *
 * @param {{ t: Function, holidays: object[], location: object, formatDay: (iso: string) => string, onSelect?: (iso: string) => void }} props
 */
export function HolidaysSection({ t, holidays, location, formatDay, onSelect }) {
  const applies = holidays.filter(
    (holiday) => holiday.scope === 'national' || holiday.region === location.region,
  );
  const elsewhere = holidays.filter(
    (holiday) => holiday.scope === 'regional' && holiday.region !== location.region,
  );

  return (
    <section aria-labelledby="calendar-holidays-heading" className="grid gap-3">
      <h2 id="calendar-holidays-heading" className="text-md">
        {t('holidays.title')}
      </h2>

      <p className="text-text-muted text-sm">
        {applies.length === 0
          ? t('holidays.none')
          : t('holidays.applies', {
              site: location.site,
              region: location.regionLabel,
              count: applies.length,
            })}
      </p>

      {applies.length > 0 ? (
        <ul className="grid gap-2">
          {applies.map((holiday) => (
            <li
              key={`${holiday.date}-${holiday.title}`}
              className="border-border bg-surface flex flex-wrap items-center gap-3 rounded-card border px-4 py-3"
            >
              <Badge tone={holiday.scope === 'national' ? 'danger' : 'warning'}>
                {holiday.scope === 'national' ? t('holidays.national') : t('holidays.regional')}
              </Badge>
              <button
                type="button"
                onClick={() => onSelect?.(holiday.date)}
                className="text-text focus-visible:ring-primary rounded-input w-fit text-left text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2"
              >
                {formatDay(holiday.date)}
              </button>
              <span className="min-w-0 text-sm">{holiday.title}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {elsewhere.length > 0 ? (
        <details className="border-border rounded-card border px-4 py-3">
          <summary className="focus-visible:ring-primary cursor-pointer text-sm font-medium rounded-input focus-visible:outline-none focus-visible:ring-2">
            {t('holidays.other', { count: elsewhere.length })}
          </summary>
          <ul className="mt-2 grid gap-1.5">
            {elsewhere.map((holiday) => (
              <li
                key={`${holiday.date}-${holiday.title}`}
                className="text-text-muted flex flex-wrap items-center gap-3 text-sm"
              >
                <span className="tabular">{formatDay(holiday.date)}</span>
                <span>{holiday.title}</span>
                <Badge tone="neutral">{holiday.regionLabel}</Badge>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="text-text-faint text-xs">{t('holidays.sample')}</p>
    </section>
  );
}
