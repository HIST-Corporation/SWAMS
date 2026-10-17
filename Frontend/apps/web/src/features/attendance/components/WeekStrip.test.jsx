// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { WeekStrip } from './WeekStrip.jsx';
import { fetchAttendanceHistory } from '../api.js';

vi.mock('../api.js', () => ({ fetchAttendanceHistory: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

/**
 * Sunday 2026-10-04 through Saturday 2026-10-10, newest first the way
 * `GET /attendance/history` returns rows. The strip has to sort them out.
 */
const HISTORY = {
  rows: [
    { date: '2026-10-10', workedMinutes: 0 },
    { date: '2026-10-09', workedMinutes: 0 },
    { date: '2026-10-08', workedMinutes: 508 },
    { date: '2026-10-07', workedMinutes: 462 },
    { date: '2026-10-06', workedMinutes: 0 },
    { date: '2026-10-05', workedMinutes: 486 },
    { date: '2026-10-04', workedMinutes: 486 },
  ],
  page: 1,
  hasMore: true,
};

/** Wednesday 2026-10-07 — four days into the week above. */
const WEDNESDAY = new Date('2026-10-07T04:00:00.000Z');

/** Strip the whole region down to one string, spans and all. */
const textOf = (node) => node.textContent.replace(/\s+/g, ' ').trim();

function renderStrip({ now = WEDNESDAY } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <WeekStrip now={now} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('WeekStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAttendanceHistory.mockResolvedValue(HISTORY);
  });

  it('asks for a week of history, once', async () => {
    renderStrip();

    await waitFor(() => expect(fetchAttendanceHistory).toHaveBeenCalledTimes(1));
    expect(fetchAttendanceHistory).toHaveBeenCalledWith({ page: 1, perPage: 7 });
  });

  it('states the week total and how many days carried it', async () => {
    renderStrip();

    const strip = await screen.findByRole('region', { name: 'This week' });
    // 486 + 486 + 0 + 462 + 508 = 1942 minutes, over four worked days.
    const summary = textOf(within(strip).getByText(/days/));
    expect(summary).toContain('32h 22m');
    expect(summary).toContain('4 days');
    expect(summary).toContain('4 days in');
  });

  it('draws every day in order, keeping an unworked day as a real zero', async () => {
    renderStrip();

    const strip = await screen.findByRole('region', { name: 'This week' });
    const days = within(strip).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    // Sunday through Saturday, oldest first. An unworked day still gets a
    // column, and the em-dash stands in for "no minutes recorded" — the same
    // figure the history table prints, so the two never disagree.
    expect(days.map((day) => textOf(day))).toEqual([
      expect.stringContaining('8h 06m'),
      expect.stringContaining('8h 06m'),
      expect.stringMatching(/—$/),
      expect.stringContaining('7h 42m'),
      expect.stringContaining('8h 28m'),
      expect.stringMatching(/—$/),
      expect.stringMatching(/—$/),
    ]);
    // And the weekday labels are in the same order.
    expect(days.map((day) => textOf(day).slice(0, 3))).toEqual([
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]);
  });

  it('says how much of the scheduled week has accrued', async () => {
    renderStrip();

    const strip = await screen.findByRole('region', { name: 'This week' });
    // Four days in at eight hours each — 32h accrued against the schedule.
    expect(textOf(strip)).toContain('32h scheduled so far');
  });

  it('renders an error state with a retry when history fails', async () => {
    fetchAttendanceHistory.mockRejectedValueOnce(
      Object.assign(new Error('Down'), { requestId: 'r1' }),
    );
    renderStrip();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'This week' })).not.toBeInTheDocument();
  });
});
