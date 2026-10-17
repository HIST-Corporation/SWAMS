// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { ReportsPage } from './ReportsPage.jsx';
import { fetchReport, fetchReportCsv } from '../api.js';
import { triggerBlobDownload } from '../../../lib/download.js';

vi.mock('../api.js', () => ({
  fetchReport: vi.fn(),
  fetchReportCsv: vi.fn(),
}));
vi.mock('../../../lib/download.js', () => ({
  triggerBlobDownload: vi.fn(),
}));

const i18n = initI18n({ lng: 'en' });

const ATTENDANCE = {
  type: 'attendance',
  from: '2026-09-01',
  to: '2026-09-30',
  rows: [
    {
      employee: 'Sita Shrestha',
      present: 20,
      late: 1,
      absent: 0,
      onLeave: 1,
      workedMinutes: 9570,
    },
  ],
  summary: { headcount: 1, present: 20, late: 1, absent: 0, onLeave: 1, workedMinutes: 9570 },
};

function renderReports() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ReportsPage />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default report with summary tiles and formatted durations', async () => {
    fetchReport.mockResolvedValue(ATTENDANCE);
    renderReports();

    await screen.findByText('Sita Shrestha');
    // Worked minutes render as a duration, not a raw number — in the summary
    // tile AND in the row (`workedMinutes` is the payload's name, so a row read
    // of `row.worked` printed "NaNh NaNm" before).
    expect(screen.getAllByText('159h 30m')).toHaveLength(2);
    expect(within(screen.getByRole('table')).getByText('159h 30m')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    // Header cells carry the localized column names with proper scopes.
    expect(screen.getByRole('columnheader', { name: 'On leave' })).toBeInTheDocument();
  });

  it('re-requests with the new type when the report select changes', async () => {
    fetchReport.mockResolvedValue(ATTENDANCE);
    const user = userEvent.setup();
    renderReports();

    await screen.findByText('Sita Shrestha');
    await user.selectOptions(screen.getByLabelText('Report'), 'tasks');

    await waitFor(() => {
      expect(fetchReport).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'tasks' }));
    });
  });

  it('blocks an inverted range with an inline alert instead of calling the API', async () => {
    fetchReport.mockResolvedValue(ATTENDANCE);
    renderReports();

    await screen.findByText('Sita Shrestha');
    const calls = fetchReport.mock.calls.length;

    const from = screen.getByLabelText(/^from/i);
    // Date inputs don't take free typing — set the value directly.
    fireEvent.change(from, { target: { value: '2026-12-31' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/start date/i);
    expect(fetchReport.mock.calls.length).toBe(calls);
  });

  it('exports the CSV through the server and confirms with a status line', async () => {
    fetchReport.mockResolvedValue(ATTENDANCE);
    fetchReportCsv.mockResolvedValue(new Blob(['employee\r\nSita Shrestha']));
    const user = userEvent.setup();
    renderReports();

    await screen.findByText('Sita Shrestha');
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => {
      expect(fetchReportCsv).toHaveBeenCalledWith(expect.objectContaining({ type: 'attendance' }));
      expect(triggerBlobDownload).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/download has started/i);
  });

  it('reports a failed export inline without losing the table', async () => {
    fetchReport.mockResolvedValue(ATTENDANCE);
    fetchReportCsv.mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    renderReports();

    await screen.findByText('Sita Shrestha');
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't prepare/i);
    expect(screen.getByText('Sita Shrestha')).toBeInTheDocument();
  });

  it('offers a retry when the report request fails', async () => {
    fetchReport
      .mockRejectedValueOnce(
        Object.assign(new Error('Could not reach the server.'), { requestId: 'req_21' }),
      )
      .mockResolvedValue(ATTENDANCE);
    const user = userEvent.setup();
    renderReports();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Sita Shrestha')).toBeInTheDocument();
  });
});
