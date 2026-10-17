import { useEffect, useRef, useState } from 'react';
import {
  addDays,
  clampToMonth,
  isoDay,
  stepMonthIso,
  weekdayIndex,
  WEEKLY_OFF_INDEX,
} from '../utils/month.js';
import { DayCell } from './DayCell.jsx';

/** Arrow keys → how many days to move. Vertical is a whole week. */
const ARROW_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/** Full weekday names of one reference week, Sunday first, in the visitor's locale. */
export function weekdayNames(locale) {
  const sunday = Date.UTC(2023, 0, 1);
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(sunday + index * 86_400_000)),
  );
}

/**
 * Month grid: Sunday-first 7-column layout with weekday headers, exposed as a
 * real ARIA grid (rows of gridcells) so a screen reader navigates it as the
 * table it looks like — the opposite of 35 loose buttons.
 *
 * One day is the tab stop (roving `tabindex`) and the day itself answers the
 * keys: ←/→ a day, ↑/↓ a week, Home/End the ends of the row, PageUp/PageDown
 * the month before/after (past an edge the page steps the month rather than
 * stopping silently). Every move is announced by the day's accessible name
 * (§8.9): the hints pair colour with words in that name and in the detail
 * panel, Saturday reads as the weekly off, and only the kinds the visitor
 * switched on are drawn.
 *
 * @param {{ t: Function, locale: string, bounds: object, byDate: Map, selected: string, todayIso: string, kinds: Set<string>, formatDay: (iso: string) => string, onSelect: (iso: string) => void, onNavigate?: (iso: string) => void, focusIso?: string|null, onFocused?: Function }} props
 */
export function MonthGrid({
  t,
  locale,
  bounds,
  byDate,
  selected,
  todayIso,
  kinds,
  formatDay,
  onSelect,
  onNavigate,
  focusIso = null,
  onFocused,
}) {
  const gridRef = useRef(null);
  // Where the keyboard stands — valid only while it belongs to the current
  // selection, so a day picked elsewhere takes the tab stop back.
  const [aim, setAim] = useState({ iso: null, at: selected });

  // A move that left the month asks the page to step it, and the page hands the
  // day back: this component is the skeleton while the next month loads, so a
  // request held locally would die with the unmount and strand focus.
  useEffect(() => {
    if (!focusIso) return;
    const node = gridRef.current?.querySelector(`[data-iso="${focusIso}"]`);
    if (!node) return;
    node.focus();
    onFocused?.();
  }, [focusIso, byDate, onFocused]);

  const headers = weekdayNames(locale);
  const cells = [];
  for (let blank = 0; blank < weekdayIndex(bounds.from); blank += 1) {
    cells.push(null);
  }
  const [yearText, monthText] = bounds.from.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  for (let day = 1; day <= bounds.daysInMonth; day += 1) {
    cells.push(isoDay(year, month, day));
  }

  // Every row carries seven cells: leading blanks hold the first week's place,
  // trailing ones keep the last row square, so it never ends in a three-day stub.
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    const week = cells.slice(index, index + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const aimed = aim.at === selected ? aim.iso : null;
  // The roving tab stop must always exist, even in the render between a month
  // step and focus catching up.
  const tabbable = cells.includes(aimed ?? selected) ? (aimed ?? selected) : bounds.from;
  const nodeFor = (iso) => gridRef.current?.querySelector(`[data-iso="${iso}"]`);

  const focusDay = (iso) => {
    if (iso < bounds.from || iso > bounds.to) {
      onNavigate?.(iso);
      return;
    }
    setAim({ iso, at: selected });
    nodeFor(iso)?.focus();
  };

  const onDayKeyDown = (iso, event) => {
    if (ARROW_STEPS[event.key] !== undefined) {
      event.preventDefault();
      focusDay(addDays(iso, ARROW_STEPS[event.key]));
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekStart = addDays(iso, -weekdayIndex(iso));
      focusDay(clampToMonth(event.key === 'Home' ? weekStart : addDays(weekStart, 6), bounds));
      return;
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      onNavigate?.(stepMonthIso(iso, event.key === 'PageUp' ? -1 : 1));
    }
  };

  return (
    <div className="border-border bg-surface grid gap-3 rounded-card border p-3 md:p-4">
      <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
        {headers.map((name) => (
          <span
            key={name}
            className="text-text-muted px-1 py-1 text-center text-xs font-semibold uppercase tracking-wide md:text-sm"
          >
            {name}
          </span>
        ))}
      </div>
      <div ref={gridRef} role="grid" aria-label={t('title')} className="grid gap-1.5">
        {weeks.map((week, weekIndex) => (
          <div role="row" key={week[0] ?? `week-${weekIndex}`} className="grid grid-cols-7 gap-1.5">
            {week.map((iso, index) =>
              iso === null ? (
                <span
                  role="gridcell"
                  aria-hidden="true"
                  key={`blank-${weekIndex}-${index}`}
                  className="min-h-14 md:min-h-24"
                />
              ) : (
                <div role="gridcell" key={iso} aria-selected={selected === iso} className="flex">
                  <DayCell
                    t={t}
                    iso={iso}
                    events={(byDate.get(iso) ?? []).filter((event) => kinds.has(event.kind))}
                    selected={selected === iso}
                    tabbable={iso === tabbable}
                    isToday={iso === todayIso}
                    isWeeklyOff={weekdayIndex(iso) === WEEKLY_OFF_INDEX}
                    formatDay={formatDay}
                    onSelect={onSelect}
                    onKeyDown={onDayKeyDown}
                  />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

