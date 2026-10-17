// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { BenchmarkTable } from './BenchmarkTable.jsx';
import { fetchOrgDashboard } from '../api.js';

vi.mock('../api.js', () => ({ fetchOrgDashboard: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const renderTable = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <BenchmarkTable />
      </I18nextProvider>
    </QueryClientProvider>,
  );

const ROWS = [
  {
    id: 'bm_rate',
    metric: 'attendanceRate',
    swams: 89.4,
    industry: 85,
    unit: 'percent',
    status: 'better',
    delta: 4.4,
  },
  {
    id: 'bm_late',
    metric: 'lateArrivals',
    swams: 3.2,
    industry: 5.1,
    unit: 'perMonth',
    status: 'better',
  },
  {
    id: 'bm_overtime',
    metric: 'overtime',
    swams: 8.4,
    industry: 6.2,
    unit: 'perWeek',
    status: 'high',
  },
];

describe('BenchmarkTable', () => {
  it('formats each row in its own unit and names the verdict in words', async () => {
    fetchOrgDashboard.mockResolvedValue({ benchmarks: ROWS });
    renderTable();

    const table = await screen.findByRole('table');
    // A rate and a count are not the same unit, and the row says which is which.
    expect(within(table).getByText('89%')).toBeInTheDocument();
    expect(within(table).getByText('3.2/mo')).toBeInTheDocument();
    expect(within(table).getByText('8.4/wk')).toBeInTheDocument();
    // The attendance row's chip is the delta; the others are status words.
    expect(within(table).getByText('+4.4%')).toBeInTheDocument();
    expect(within(table).getByText('High')).toBeInTheDocument();
    // The metric label is translated, not the raw payload key.
    expect(within(table).getByText('Overtime hours')).toBeInTheDocument();
    expect(screen.queryByText(/^bench\./)).toBeNull();
  });

  it('gives every column and row a scoped header', async () => {
    fetchOrgDashboard.mockResolvedValue({ benchmarks: ROWS });
    renderTable();

    const table = await screen.findByRole('table');
    for (const name of ['Metric', 'SWAMS', 'Industry', 'Status']) {
      expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(
      within(table).getByRole('rowheader', { name: 'Average late arrivals' }),
    ).toBeInTheDocument();
  });

  it('shows the designed empty state when the org has no benchmark yet', async () => {
    fetchOrgDashboard.mockResolvedValue({ benchmarks: [] });
    renderTable();

    expect(await screen.findByText('No benchmark yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
