import { monthBounds, nepalToday } from '../utils/month.js';

/**
 * Calendar fixtures (Section 8.8: realistic Nepali org, no lorem ipsum).
 * MOCK ONLY — labelled sample data, never presented as production behavior.
 * Self-contained on purpose: the calendar feature may not reach into another
 * feature's internals (Section 6.2 rule 1), so it owns its own event truth
 * instead of importing the leave/meetings stores.
 *
 * Events are pinned to fixed days of the CURRENT Nepal month so the grid
 * always shows content whenever the mock loads. Days without events are
 * simply absent — the client renders empty cells for presentation only.
 */

const today = nepalToday();

function dayOfMonth(day) {
  const { daysInMonth } = monthBounds(today.year, today.month);
  return `${today.year}-${String(today.month).padStart(2, '0')}-${String(Math.min(day, daysInMonth)).padStart(2, '0')}`;
}

export const EVENT_KINDS = ['leave', 'holiday', 'meeting'];

/**
 * Where the institution is — the holiday section is scoped by this (\"depending
 * upon where the institution is\"). Himal Digital's demo HQ is Baneshwor,
 * Kathmandu, in Bagmati Province; with the real API this comes from the org's
 * settings (contract request 27).
 */
export const ORG_LOCATION = { site: 'Baneshwor', region: 'bagmati', regionLabel: 'Bagmati' };

/**
 * Public holidays for the demo month — SAMPLE DATA, said so in the UI.
 * `scope: 'national'` applies to every institution; `scope: 'regional'`
 * applies only where `region` matches the org's location, which is what lets
 * the section show what matters here and collapse what does not.
 */
export const HOLIDAYS = [
  { day: 15, scope: 'national', region: null, regionLabel: null, title: 'Dashain holiday' },
  { day: 19, scope: 'national', region: null, regionLabel: null, title: 'Maha Navami holiday' },
  {
    day: 22,
    scope: 'regional',
    region: 'bagmati',
    regionLabel: 'Bagmati',
    title: 'Kumar Jatra holiday (Kathmandu valley)',
  },
  { day: 28, scope: 'regional', region: 'lumbini', regionLabel: 'Lumbini', title: 'Lumbini Day' },
].map((holiday) => ({ ...holiday, date: dayOfMonth(holiday.day) }));

/** Holiday grid events come from the same list, so the two can never disagree. */
const HOLIDAY_EVENTS = HOLIDAYS.map(({ date, title }) => ({ date, kind: 'holiday', title }));

export const CALENDAR_EVENTS = [
  { date: dayOfMonth(8), kind: 'meeting', title: 'Weekly planning' },
  { date: dayOfMonth(10), kind: 'leave', title: 'Anita Thapa — annual leave' },
  { date: dayOfMonth(11), kind: 'leave', title: 'Anita Thapa — annual leave' },
  { date: dayOfMonth(12), kind: 'leave', title: 'Anita Thapa — annual leave' },
  { date: dayOfMonth(20), kind: 'meeting', title: 'Team retrospective' },
  { date: dayOfMonth(27), kind: 'leave', title: 'Ramesh Adhikari — sick leave' },
  ...HOLIDAY_EVENTS,
].sort((a, b) => (a.date < b.date ? -1 : 1));

/**
 * Events grouped by day for an inclusive AD range, plus the range's holidays
 * with their scope — one payload owns the grid, the agenda and the holiday
 * section, so three views of one month can never disagree.
 * Deterministic for a given (from, to); days with no events are omitted.
 * @param {string} from `YYYY-MM-DD`
 * @param {string} to `YYYY-MM-DD`
 * @returns {{from: string, to: string, days: Array<{date: string, events: Array<{kind: string, title: string}>}>, holidays: Array<{date: string, title: string, scope: string, region: string|null, regionLabel: string|null}>}}
 */
export function deriveCalendar(from, to) {
  const inRange = CALENDAR_EVENTS.filter((event) => event.date >= from && event.date <= to);
  const byDate = new Map();
  for (const event of inRange) {
    if (!byDate.has(event.date)) byDate.set(event.date, []);
    byDate.get(event.date).push({ kind: event.kind, title: event.title });
  }
  const holidays = HOLIDAYS.filter((holiday) => holiday.date >= from && holiday.date <= to).map(
    ({ date, title, scope, region, regionLabel }) => ({ date, title, scope, region, regionLabel }),
  );
  return {
    from,
    to,
    days: [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, events]) => ({ date, events })),
    holidays,
  };
}
