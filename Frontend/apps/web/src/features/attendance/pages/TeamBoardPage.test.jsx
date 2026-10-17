// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { TeamBoardPage } from './TeamBoardPage.jsx';
import { fetchTeamAttendance } from '../api.js';

vi.mock('../api.js', () => ({ fetchTeamAttendance: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const BOARD = {
  summary: { present: 3, late: 1, onLeave: 1, notIn: 1, expected: 6 },
  rows: [
    {
      id: 'u_sita',
      name: 'Sita Shrestha',
      site: 'Baneshwor',
      presence: 'in',
      clockIn: '09:02',
      workedMinutes: 486,
      exception: null,
    },
    {
      id: 'u_prakash',
      name: 'Prakash Gurung',
      site: 'Pokhara',
      presence: 'late',
      clockIn: '09:46',
      workedMinutes: 442,
      exception: 'late_arrival',
    },
    {
      id: 'u_bibek',
      name: 'Bibek Karki',
      site: 'Lalitpur',
      presence: 'out',
      clockIn: null,
      workedMinutes: 0,
      exception: 'no_punch',
    },
  ],
};

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <TeamBoardPage />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('TeamBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the server-owned summary, every row, and only the exception rows in the attention band', async () => {
    fetchTeamAttendance.mockResolvedValue(BOARD);
    renderBoard();

    await screen.findByRole('heading', { level: 1, name: 'Team attendance' });
    // The tiles and summary sentence only appear once the server answers.
    await screen.findByText('Sita Shrestha');
    // Server numbers, verbatim: three tiles plus the summary sentence.
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('3 of 6 in today')).toBeInTheDocument();

    const board = screen.getByRole('list', { name: "Who's in" });
    expect(within(board).getByText('Sita Shrestha')).toBeInTheDocument();
    expect(within(board).getByText('Prakash Gurung')).toBeInTheDocument();
    expect(within(board).getByText('Bibek Karki')).toBeInTheDocument();

    // The attention band carries exactly the flagged rows — never the clean one.
    const exceptions = screen.getByRole('list', { name: 'Needs attention' });
    expect(within(exceptions).getByText('Prakash Gurung')).toBeInTheDocument();
    expect(within(exceptions).getByText('Late arrival')).toBeInTheDocument();
    expect(within(exceptions).queryByText('Sita Shrestha')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review correction requests' })).toHaveAttribute(
      'href',
      '/attendance/corrections',
    );
  });

  it('says the day is clean when nothing is flagged', async () => {
    fetchTeamAttendance.mockResolvedValue({
      summary: BOARD.summary,
      rows: [BOARD.rows[0]],
    });
    renderBoard();

    await screen.findByRole('heading', { level: 1, name: 'Team attendance' });
    await screen.findByText('Sita Shrestha');
    expect(screen.queryByRole('list', { name: 'Needs attention' })).not.toBeInTheDocument();
    expect(screen.getByText('Nothing needs attention today.')).toBeInTheDocument();
  });

  it('renders an error state with a retry when the board fails', async () => {
    fetchTeamAttendance.mockRejectedValueOnce(
      Object.assign(new Error('Down'), { requestId: 'r1' }),
    );
    renderBoard();

    // The header stays (it is the page, not the data); the board content never appears.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: "Who's in" })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Needs attention' })).not.toBeInTheDocument();
  });

  it('renders an empty state when nobody is on the board', async () => {
    fetchTeamAttendance.mockResolvedValue({ summary: null, rows: [] });
    renderBoard();

    expect(await screen.findByText('No one is expected today.')).toBeInTheDocument();
  });
});
