import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, ErrorState, Skeleton } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';
import { useCalendar } from '../hooks/useCalendar.js';
import {
  isIsoDate,
  isoDay,
  monthBounds,
  nepalToday,
  nextMonth,
  prevMonth,
} from '../utils/month.js';
import { KindFilter, KINDS } from '../components/KindFilter.jsx';
import { HolidaysSection } from '../components/HolidaysSection.jsx';
import { MonthAgenda } from '../components/MonthAgenda.jsx';
import { MonthGrid } from '../components/MonthGrid.jsx';
import { ORG_LOCATION } from '../mocks/fixtures.js';

/** Kind → badge tone; the word is always the kind's text (§8.9). */
const KIND_TONE = { leave: 'info', holiday: 'danger', meeting: 'primary' };

/**
 * `/calendar` — the month grid behind `team.read` (slice 8). Leave, holidays
 * and meetings on one month as seen in Asia/Kathmandu; BS waits on the
 * verified converter (§24), so every date here is still AD.
 *
 * Three things sit beside the grid, each answering a real question: a Today
 * button ("where am I?"), kind toggles ("show me only leave"), and the month
 * agenda — the same month in words, which is what a 360px phone actually
 * reads. The selected day lives in `?date=`, so a month can be linked,
 * bookmarked or reloaded exactly as it was left. Every day is a button, so the
 * grid works by touch, tab and mouse alike.
 */
export function CalendarPage() {
  const { t, i18n } = useTranslation('calendar');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const [searchParams, setSearchParams] = useSearchParams();
  const now = nepalToday();

  const deepLinked = searchParams.get('date');
  const linked = isIsoDate(deepLinked) ? deepLinked : null;
  const [cursor, setCursor] = useState(() =>
    linked ? { year: Number(linked.slice(0, 4)), month: Number(linked.slice(5, 7)) } : now,
  );
  const [selected, setSelected] = useState(() => linked ?? now.iso);
  const [kinds, setKinds] = useState(() => new Set(KINDS));
  // Held here, not in the grid: a month step swaps the grid for its skeleton,
  // so the day a keyboard move wants to land on has to survive the unmount.
  const [focusIso, setFocusIso] = useState(null);

  const bounds = monthBounds(cursor.year, cursor.month);
  const calendar = useCalendar({ from: bounds.from, to: bounds.to });

  // The selected day is part of the URL: reload and it comes back.
  useEffect(() => {
    setSearchParams(
      (params) => {
        if (params.get('date') === selected) return params;
        const next = new URLSearchParams(params);
        next.set('date', selected);
        return next;
      },
      { replace: true },
    );
  }, [selected, setSearchParams]);

  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu',
  }).format(new Date(`${bounds.from}T12:00:00Z`));

  const formatDay = (iso) => formatDateAd(new Date(`${iso}T12:00:00Z`), { locale });

  const toggleKind = (kind) =>
    setKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  const onThisMonth = cursor.year === now.year && cursor.month === now.month;
  const go = (next) => {
    setCursor(next);
    setSelected(isoDay(next.year, next.month, 1));
  };

  // Keyboard moves that cross a month edge (arrow past the last day, PageUp/
  // PageDown): the grid asks for the day it wants to reach and the page both
  // steps the cursor and takes the selection with it, so the URL stays true.
  const navigateTo = (iso) => {
    setCursor({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) });
    setSelected(iso);
    setFocusIso(iso);
  };

  const days = calendar.days
    .map((day) => ({ ...day, events: day.events.filter((event) => kinds.has(event.kind)) }))
    .filter((day) => day.events.length > 0);

  return (
    <div className="mx-auto grid w-full max-w-[64rem] gap-6">
      <header className="grid gap-1">
        <h1 className="text-xl">{t('title')}</h1>
        <p className="text-text-muted text-sm">{t('subtitle')}</p>
      </header>

      <div className="sr-only" aria-live="polite">
        {calendar.isLoading ? '' : monthTitle}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-md">{monthTitle}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="quiet"
            size="sm"
            disabled={onThisMonth}
            onClick={() => go({ year: now.year, month: now.month })}
          >
            {t('today')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={t('prevMonth')}
            onClick={() => go(prevMonth(cursor))}
          >
            <ChevronLeft aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={t('nextMonth')}
            onClick={() => go(nextMonth(cursor))}
          >
            <ChevronRight aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
        </div>
      </div>

      <KindFilter
        t={t}
        kinds={kinds}
        onToggle={toggleKind}
        onClear={() => setKinds(new Set(KINDS))}
      />

      {calendar.isLoading ? (
        <div aria-busy="true" className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-input md:h-24" />
          ))}
        </div>
      ) : calendar.error ? (
        <ErrorState
          message={calendar.error.message || t('loadError')}
          requestId={calendar.error.requestId}
          onRetry={calendar.refetch}
        />
      ) : (
        <>
          <MonthGrid
            t={t}
            locale={locale}
            bounds={bounds}
            byDate={calendar.byDate}
            selected={selected}
            todayIso={now.iso}
            kinds={kinds}
            formatDay={formatDay}
            onSelect={setSelected}
            onNavigate={navigateTo}
            focusIso={focusIso}
            onFocused={() => setFocusIso(null)}
          />

          <MonthAgenda
            t={t}
            days={days}
            selected={selected}
            filtered={days.length !== calendar.days.length}
            formatDay={formatDay}
            onSelect={setSelected}
          />

          <HolidaysSection
            t={t}
            holidays={calendar.holidays}
            location={ORG_LOCATION}
            formatDay={formatDay}
            onSelect={setSelected}
          />

          <DayDetail
            t={t}
            events={(calendar.byDate.get(selected) ?? []).filter((event) => kinds.has(event.kind))}
            heading={t('eventsHeading', { date: formatDay(selected) })}
          />
        </>
      )}
    </div>
  );
}

/**
 * The selected day's events in words (Section 8.9: the dots never stand
 * alone). The heading is built from the date, so this panel is always
 * addressable by the date it is showing.
 */
function DayDetail({ t, events, heading }) {
  return (
    <section aria-labelledby="calendar-day-heading" className="grid gap-3">
      <h2 id="calendar-day-heading" className="text-md">
        {heading}
      </h2>
      {events.length === 0 ? (
        <p className="text-text-faint text-sm">{t('noEventsDay')}</p>
      ) : (
        <ul className="grid gap-2">
          {events.map((event, index) => (
            <li
              key={`${event.kind}-${index}`}
              className="border-border bg-surface flex items-center gap-3 rounded-card border px-4 py-3"
            >
              <Badge tone={KIND_TONE[event.kind] ?? 'neutral'}>{t(`kind.${event.kind}`)}</Badge>
              <span className="text-sm">{event.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
