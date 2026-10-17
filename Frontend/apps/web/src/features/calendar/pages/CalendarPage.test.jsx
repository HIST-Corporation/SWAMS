// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { CalendarPage } from './CalendarPage.jsx';
import { fetchCalendar } from '../api.js';
import { isoDay, monthBounds, nepalToday, nextMonth, weekdayIndex } from '../utils/month.js';

vi.mock('../api.js', () => ({ fetchCalendar: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const OCTOBER = {
  from: '2026-10-01',
  to: '2026-10-31',
  days: [
    { date: '2026-10-08', events: [{ kind: 'meeting', title: 'Weekly planning' }] },
    {
      date: '2026-10-15',
      events: [
        { kind: 'holiday', title: 'Dashain holiday' },
        { kind: 'meeting', title: 'Team standup' },
      ],
    },
  ],
};
const NOVEMBER = { from: '2026-11-01', to: '2026-11-30', days: [] };

/** Echoes the router's `?date=` so a test can read what the page wrote. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.search}</span>;
}

function renderCalendar({ initialEntry = '/' } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}>
          <CalendarPage />
          <LocationProbe />
        </I18nextProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/**
 * The month grid, as its own region. Day "15" appears on this page in the
 * cell, in the agenda and in the day-detail heading, so every test that picks
 * a day goes through here rather than a page-wide query. The grid is addressed
 * by its label; it is a real ARIA grid, so the cells below it are gridcells.
 */
function grid() {
  return screen.getByLabelText('Calendar');
}

/** The gridcell that holds one day, addressed by the date in its name. */
function dayCell(day) {
  return within(grid()).getByRole('gridcell', { name: new RegExp(`^${day}\\b`) });
}

/** Pick one day by its day number, inside the grid only. */
async function pickDay(user, day) {
  await user.click(within(grid()).getByRole('button', { name: new RegExp(`^${day}\\b`) }));
}

/** The day number currently holding the grid's single tab stop. */
function tabStop() {
  const stop = within(grid())
    .getAllByRole('button')
    .find((button) => button.tabIndex === 0);
  return Number(stop?.dataset.iso.slice(8, 10));
}

/**
 * The selected-day panel. Its heading is built from the date it is showing, so
 * it is addressed that way — the one place a single event title is written out
 * in words (the grid only hints with dots).
 */
function dayDetail() {
  return screen.getByRole('region', { name: /events on /i });
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders the grid, legend and the selected day in words', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    renderCalendar();

    await screen.findByLabelText('Legend');
    // Weekday headers come from the locale, never raw strings — and they only
    // appear once the query settles (findBy waits; getBy would race it).
    await screen.findByText('Sun');
    const user = userEvent.setup();
    await pickDay(user, 15);
    // Selecting the holiday day moves the detail panel without refetching: the
    // day's events are written out in the detail (the grid only hints with dots).
    expect(await within(dayDetail()).findByText('Dashain holiday')).toBeInTheDocument();
    expect(within(dayDetail()).getByText('Team standup')).toBeInTheDocument();
    expect(fetchCalendar).toHaveBeenCalledTimes(1);
  });

  it('announces the emptiness of a day with no events', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    // Day 1 has no fixture events; the detail panel below says so in words.
    await pickDay(user, 1);
    expect(await screen.findByText(/no events on this day/i)).toBeInTheDocument();
  });

  it('exposes the month as a grid of rows and cells, not loose buttons', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    renderCalendar();

    await screen.findByText('Sun');
    const monthGrid = screen.getByRole('grid', { name: 'Calendar' });
    // One row per week — five or six, never a seven-cell month spilling into a
    // second row — and every row is a full week wide.
    const rows = within(monthGrid).getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.length).toBeLessThanOrEqual(6);
    for (const row of rows) {
      expect(row.querySelectorAll('[role="gridcell"]')).toHaveLength(7);
    }
    // The blanks that hold the month's shape are not announced as days, so the
    // cells a screen reader walks are exactly the days of the month.
    const now = nepalToday();
    expect(within(monthGrid).getAllByRole('gridcell')).toHaveLength(
      monthBounds(now.year, now.month).daysInMonth,
    );
  });

  it('marks Saturday as the weekly off in the words of the cell', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    renderCalendar();

    // findBy* rather than getBy*: the grid is behind a loading branch, so it
    // only exists once the month resolves.
    const cells = within(await screen.findByLabelText('Calendar'));
    // Derive the dates rather than hardcoding them: the grid opens on the
    // month Nepal is actually in today, and every month has both.
    const { year, month } = nepalToday();
    const { daysInMonth } = monthBounds(year, month);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    const onSaturday = (day) => weekdayIndex(isoDay(year, month, day)) === 6;
    const saturday = days.find(onSaturday);
    const weekday = days.find((day) => !onSaturday(day));

    // The weekly off is written out, never carried by colour alone (§8.9).
    expect(
      await cells.findByRole('button', { name: new RegExp(`^${saturday}\\b`) }),
    ).toHaveAccessibleName(/weekly off/i);
    // A weekday carries no such claim.
    expect(
      cells.getByRole('button', { name: new RegExp(`^${weekday}\\b`) }),
    ).not.toHaveAccessibleName(/weekly off/i);
  });

  it('moves a month at a time and refetches the new bounds', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    // The cursor starts at the real Nepal month, so derive the next bounds
    // the same way the page does instead of hardcoding a month.
    const next = nextMonth(nepalToday());
    const expected = monthBounds(next.year, next.month);
    fetchCalendar.mockResolvedValue({ ...NOVEMBER, ...expected, days: [] });
    await user.click(screen.getByRole('button', { name: /next month/i }));

    await waitFor(() => {
      expect(fetchCalendar).toHaveBeenCalledWith(
        expect.objectContaining({ from: expected.from, to: expected.to }),
      );
    });
    expect(await screen.findByText(/nothing is booked this month/i)).toBeInTheDocument();
  });

  it('jumps back to the current month with Today', async () => {
    const next = nextMonth(nepalToday());
    const expected = monthBounds(next.year, next.month);
    fetchCalendar.mockResolvedValue({ ...NOVEMBER, ...expected, days: [] });
    const user = userEvent.setup();
    renderCalendar();

    await user.click(screen.getByRole('button', { name: /next month/i }));
    await waitFor(() => expect(fetchCalendar).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: /^today$/i }));
    const now = nepalToday();
    const thisMonth = monthBounds(now.year, now.month);
    await waitFor(() => {
      expect(fetchCalendar).toHaveBeenCalledWith(
        expect.objectContaining({ from: thisMonth.from, to: thisMonth.to }),
      );
    });
    // Back on this month, the control steps aside rather than offering a loop.
    expect(screen.getByRole('button', { name: /^today$/i })).toBeDisabled();
  });

  it('filters the month by kind through the legend toggles', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    // Both kinds are on: the detail for the 15th lists them together.
    await pickDay(user, 15);
    expect(await within(dayDetail()).findByText('Team standup')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /meeting/i }));
    expect(await within(dayDetail()).findByText(/Dashain holiday/i)).toBeInTheDocument();
    expect(within(dayDetail()).queryByText('Team standup')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show all/i }));
    expect(await within(dayDetail()).findByText('Team standup')).toBeInTheDocument();
  });

  it('names the first event inside a wide cell and counts the rest', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    await pickDay(user, 15);
    const cell = dayCell(15);
    // 15 October carries a holiday and a meeting: the wide cell names the first
    // and counts the other rather than leaving a wide empty box.
    expect(within(cell).getByText('Dashain holiday')).toBeInTheDocument();
    expect(within(cell).getByText('+1')).toBeInTheDocument();
    // The hint is decoration — the cell's accessible name already tells the
    // whole story, so the reader must not hear it twice.
    expect(
      within(cell).getByText('Dashain holiday').closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    // …the name of the control the reader actually lands on.
    expect(within(cell).getByRole('button')).toHaveAccessibleName(
      /2 events: Dashain holiday, Team standup/,
    );
  });

  it('lists the whole month as words in the agenda', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    const agenda = within(screen.getByRole('region', { name: /this month/i }));
    expect(agenda.getByText('Weekly planning')).toBeInTheDocument();

    // A day picked from the agenda selects the same day in the grid + URL.
    await user.click(agenda.getByRole('button', { name: /15/ }));
    expect(dayCell(15)).toHaveAttribute('aria-selected', 'true');
    // …and only that day is selected.
    expect(dayCell(8)).toHaveAttribute('aria-selected', 'false');
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/date=\d{4}-\d{2}-\d{2}/),
    );
  });

  it('reopens a deep-linked month on the day it was linked to', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    renderCalendar({ initialEntry: '/?date=2026-10-15' });

    await screen.findByText('Sun');
    // The selected day came from the URL, not from the cursor's default, and it
    // is also the grid's tab stop, so Tab lands where the link pointed.
    expect(dayCell(15)).toHaveAttribute('aria-selected', 'true');
    expect(tabStop()).toBe(15);
  });

  it('walks the grid with the arrow keys from a single tab stop', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    // A mid-month day, so no arrow in this test touches a month edge.
    await pickDay(user, 10);
    expect(tabStop()).toBe(10);

    await user.keyboard('{ArrowRight}');
    expect(within(dayCell(11)).getByRole('button')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(within(dayCell(18)).getByRole('button')).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowUp}');
    expect(within(dayCell(10)).getByRole('button')).toHaveFocus();

    // Walking the grid moves the tab stop with it — never a second one.
    expect(
      within(grid())
        .getAllByRole('button')
        .filter((b) => b.tabIndex === 0),
    ).toHaveLength(1);
    expect(tabStop()).toBe(10);
  });

  it('keeps Home and End inside the month', async () => {
    fetchCalendar.mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    const { year, month } = nepalToday();
    expect(Number(monthBounds(year, month).from.slice(8, 10))).toBe(1);
    // Week one always starts on the 1st (Sunday-first), so End is the first
    // Saturday and Home walks back to the 1st.
    const firstSaturday = 1 + (6 - weekdayIndex(monthBounds(year, month).from));
    await pickDay(user, 1);
    await user.keyboard('{End}');
    expect(within(dayCell(firstSaturday)).getByRole('button')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(within(dayCell(1)).getByRole('button')).toHaveFocus();
  });

  it('steps the month when an arrow walks off the end of it', async () => {
    const { year, month } = nepalToday();
    const thisMonth = monthBounds(year, month);
    const next = nextMonth({ year, month });
    const nextBounds = monthBounds(next.year, next.month);
    // The second month is held open, so the test can see what happens while a
    // keyboard month step is still loading.
    let landNextMonth;
    fetchCalendar.mockResolvedValueOnce({ ...OCTOBER, ...thisMonth }).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          landNextMonth = () => resolve({ ...nextBounds, days: [] });
        }),
    );
    const user = userEvent.setup();
    renderCalendar();

    await screen.findByText('Sun');
    const lastDay = Number(thisMonth.to.slice(8, 10));
    await pickDay(user, lastDay);
    await user.keyboard('{ArrowRight}');

    // The grid asked for the day it wanted to reach; the page stepped to it and
    // the URL followed, so the move is still linkable.
    await waitFor(() =>
      expect(fetchCalendar).toHaveBeenCalledWith(
        expect.objectContaining({ from: nextBounds.from, to: nextBounds.to }),
      ),
    );

    // Still loading: the grid is a skeleton, and the focus request is held
    // rather than dropped on the floor.
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    landNextMonth();

    await waitFor(() => expect(dayCell(1)).toHaveAttribute('aria-selected', 'true'));
    expect(within(dayCell(1)).getByRole('button')).toHaveFocus();
    expect(tabStop()).toBe(1);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(`date=${nextBounds.from}`),
    );
  });

  it('splits the month’s holidays by where the institution is', async () => {
    fetchCalendar.mockResolvedValue({
      ...OCTOBER,
      holidays: [
        {
          date: '2026-10-15',
          title: 'Dashain holiday',
          scope: 'national',
          region: null,
          regionLabel: null,
        },
        {
          date: '2026-10-22',
          title: 'Kumar Jatra holiday (Kathmandu valley)',
          scope: 'regional',
          region: 'bagmati',
          regionLabel: 'Bagmati',
        },
        {
          date: '2026-10-28',
          title: 'Lumbini Day',
          scope: 'regional',
          region: 'lumbini',
          regionLabel: 'Lumbini',
        },
      ],
    });
    const user = userEvent.setup();
    renderCalendar();

    const section = await screen.findByRole('region', { name: /public holidays/i });
    // What applies to the institution's location (Baneshwor, Bagmati): the
    // national day plus Bagmati's own — counted in one sentence.
    expect(within(section).getByText('Dashain holiday')).toBeInTheDocument();
    expect(within(section).getByText(/Kumar Jatra holiday/)).toBeInTheDocument();
    expect(within(section).getByText(/observes 2 holidays this month/)).toBeInTheDocument();
    // Another province sits collapsed behind its summary, not mixed in.
    const summary = within(section).getByText(/another region/i);
    expect(summary.closest('details')).not.toHaveAttribute('open');
    await user.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(within(section).getByText('Lumbini Day')).toBeInTheDocument();

    // The list keeps saying it is sample data until the endpoint exists.
    expect(within(section).getByText(/sample holiday list/i)).toBeInTheDocument();
  });

  it('offers a retry when the request fails', async () => {
    fetchCalendar
      .mockRejectedValueOnce(
        Object.assign(new Error('Could not reach the server.'), { requestId: 'req_23' }),
      )
      .mockResolvedValue(OCTOBER);
    const user = userEvent.setup();
    renderCalendar();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    // The retry re-renders the grid; selecting a day proves the data landed.
    await screen.findByText('Sun');
    await pickDay(user, 15);
    expect(await within(dayDetail()).findByText('Dashain holiday')).toBeInTheDocument();
  });
});
