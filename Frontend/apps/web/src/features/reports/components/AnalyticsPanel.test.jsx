// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { AnalyticsPanel, PERIODS } from './AnalyticsPanel.jsx';
import { fetchAnalytics } from '../api.js';

vi.mock('../api.js', () => ({ fetchAnalytics: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const WEEK = {
  period: 'week',
  points: [
    { date: '2026-10-06', rate: 94, minutes: 480 },
    { date: '2026-10-07', rate: 90, minutes: 470 },
    { date: '2026-10-08', rate: null, minutes: null },
  ],
  summary: { rate: 92, workedMinutes: 950, presentDays: 2, lateDays: 0 },
  breakdown: { present: 2, late: 0, absent: 0, leave: 0 },
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <AnalyticsPanel period="week" />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('AnalyticsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAnalytics.mockResolvedValue(WEEK);
  });

  it('reads one payload for the chosen period', async () => {
    renderPanel();

    await screen.findAllByText('Attendance rate');
    expect(fetchAnalytics).toHaveBeenCalledTimes(1);
    expect(fetchAnalytics).toHaveBeenCalledWith({ period: 'week' });
    expect(PERIODS).toEqual(['week', 'month', 'year']);
  });

  it('pairs every chart with the same numbers as a table', async () => {
    renderPanel();

    // Summary tiles state the server's own figures.
    expect(await screen.findByText('92%')).toBeInTheDocument();
    // The charts are pictures; the sr-only table carries the values instead.
    const table = screen.getByRole('table', { name: 'Attendance rate per bucket' });
    expect(within(table).getByText('94%')).toBeInTheDocument();
  });
});
