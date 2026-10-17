// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { StaffBoard } from './StaffBoard.jsx';
import { fetchStaffBoard } from '../api.js';
import { useSession } from '../../../hooks/useSession.js';

vi.mock('../api.js', () => ({ fetchStaffBoard: vi.fn() }));
vi.mock('../../../hooks/useSession.js', () => ({ useSession: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const renderBoard = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <StaffBoard />
      </I18nextProvider>
    </QueryClientProvider>,
  );

/** A persona board in the payload's own shape (contract request 26). */
const FE_BOARD = {
  asOf: '2026-10-12',
  counts: { open: 1, review: 1, blocked: 0, done: 0 },
  queue: [
    {
      id: 'q_fe_1',
      kind: 'review',
      status: 'review',
      priority: 'high',
      title: 'Review the punch-policy PR before the 2.4.1 cut',
      meta: 'swams-api #412',
      due: '2026-10-12',
    },
    {
      id: 'q_fe_2',
      kind: 'bug',
      status: 'open',
      priority: 'high',
      title: 'Leave page nav breaks at 360px',
      meta: 'swams-web #380',
      due: '2026-10-20',
    },
  ],
  pod: [
    {
      id: 'u_anita',
      name: 'Anita Thapa',
      initials: 'AT',
      site: 'Lalitpur',
      presence: 'in',
    },
  ],
};

describe('StaffBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue({
      user: { id: 'u_priya', name: 'Priya Sharma', jobKey: 'frontend', staffRole: 'fe' },
    });
  });

  it("renders the persona's queue, counts and pod in words", async () => {
    fetchStaffBoard.mockResolvedValue(FE_BOARD);
    renderBoard();

    expect(await screen.findByRole('heading', { name: 'Your board' })).toBeInTheDocument();
    // the board says whose desk it is, in the shell's own job title
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();

    // counts come from the payload, never re-derived on the client
    expect(
      await screen.findByText('Review the punch-policy PR before the 2.4.1 cut'),
    ).toBeInTheDocument();
    expect(screen.getByText('Leave page nav breaks at 360px')).toBeInTheDocument();

    // status and priority are words on the row itself, not colour alone (8.9)
    const row = screen.getByText('Review the punch-policy PR before the 2.4.1 cut').closest('li');
    expect(within(row).getByText('In review')).toBeInTheDocument();
    expect(within(row).getByText('High')).toBeInTheDocument();
    expect(within(row).getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('swams-api #412')).toBeInTheDocument();

    // the same date as `asOf` reads as today, not as a formatted calendar date
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.getByText('Due 20 Oct 2026')).toBeInTheDocument();

    // the pod is roster people, presence named beside the avatar (8.9)
    expect(screen.getByText('Anita Thapa')).toBeInTheDocument();
    expect(screen.getByText('In')).toBeInTheDocument();

    // the fixture is labelled as sample work until assignments exist (12.1)
    expect(screen.getByText(/Sample work queue/i)).toBeInTheDocument();
  });

  it('renders nothing for a session with no staff role, and asks for nothing', async () => {
    useSession.mockReturnValue({ user: { jobKey: 'hrManager' } });
    renderBoard();

    expect(screen.queryByRole('heading', { name: 'Your board' })).toBeNull();
    expect(screen.queryByText('Your queue is clear')).toBeNull();
    expect(fetchStaffBoard).not.toHaveBeenCalled();
  });

  it('shows the designed empty state when the queue has nothing in it', async () => {
    fetchStaffBoard.mockResolvedValue({
      ...FE_BOARD,
      queue: [],
      counts: { open: 0, review: 0, blocked: 0, done: 0 },
    });
    renderBoard();

    expect(await screen.findByText('Your queue is clear')).toBeInTheDocument();
  });

  it('offers a retry when the board request fails', async () => {
    fetchStaffBoard.mockRejectedValue(
      Object.assign(new Error('Could not reach the server.'), { requestId: 'req_9' }),
    );
    renderBoard();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
