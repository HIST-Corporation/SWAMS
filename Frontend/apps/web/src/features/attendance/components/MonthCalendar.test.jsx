// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { MonthCalendar } from './MonthCalendar.jsx';
import { fetchAttendanceCalendar } from '../api.js';

vi.mock('../api.js', () => ({ fetchAttendanceCalendar: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const OCTOBER = {
  month: '2026-10',
  days: [
    { date: '2026-10-01', status: 'present' },
    { date: '2026-10-02', status: 'late' },
    { date: '2026-10-03', status: null },
  ],
};

function renderCalendar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MonthCalendar now={new Date('2026-10-12T04:00:00.000Z')} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('MonthCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAttendanceCalendar.mockResolvedValue(OCTOBER);
  });

  it('asks for the current month, once', async () => {
    renderCalendar();

    await screen.findByRole('heading', { name: 'Month calendar' });
    expect(fetchAttendanceCalendar).toHaveBeenCalledTimes(1);
    expect(fetchAttendanceCalendar).toHaveBeenCalledWith({ month: '2026-10' });
  });

  it('names statuses the words carry, not the colours', async () => {
    renderCalendar();

    // Each day's accessible name reads date + status word (§8.9).
    expect(await screen.findByTitle('1 Oct 2026 — Present')).toBeInTheDocument();
    expect(screen.getByTitle('2 Oct 2026 — Late')).toBeInTheDocument();
    // A day that has not happened yet is upcoming, never an invented status.
    expect(screen.getByTitle('3 Oct 2026 — Upcoming')).toBeInTheDocument();
    // The legend spells every tint out in words.
    expect(screen.getByText('On leave')).toBeInTheDocument();
  });

  it('offers a retry when the month fails', async () => {
    fetchAttendanceCalendar.mockRejectedValueOnce(
      Object.assign(new Error('Down'), { requestId: 'r1' }),
    );
    renderCalendar();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
