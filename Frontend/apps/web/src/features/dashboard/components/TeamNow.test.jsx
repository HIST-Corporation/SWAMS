// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { TeamNow } from './TeamNow.jsx';
import { fetchPresence } from '../api.js';

vi.mock('../api.js', () => ({ fetchPresence: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const renderStrip = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <TeamNow />
      </I18nextProvider>
    </QueryClientProvider>,
  );

describe('TeamNow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names every person with a presence word, and counts who is in', async () => {
    fetchPresence.mockResolvedValue({
      rows: [
        { id: 'u_priya', name: 'Priya Sharma', initials: 'PS', site: 'Baneshwor', presence: 'in' },
        {
          id: 'u_prakash',
          name: 'Prakash Gurung',
          initials: 'PG',
          site: 'Pokhara',
          presence: 'late',
        },
        {
          id: 'u_sunita',
          name: 'Sunita Rai',
          initials: 'SR',
          site: 'Baneshwor',
          presence: 'leave',
        },
        { id: 'u_bibek', name: 'Bibek Karki', initials: 'BK', site: 'Lalitpur', presence: 'out' },
      ],
    });
    renderStrip();

    expect(await screen.findByRole('heading', { name: 'Team now' })).toBeInTheDocument();
    // `late` counts as being at work today — the payload's own two words
    expect(screen.getByText('2 of 4 in today')).toBeInTheDocument();

    // Presence is a word beside the avatar, never colour alone (Section 8.9).
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('In')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByText('On leave')).toBeInTheDocument();
    expect(screen.getByText('Out')).toBeInTheDocument();
    // ...and each person's site travels with them
    expect(screen.getAllByText('Baneshwor')).toHaveLength(2);
  });

  it('shows the designed empty state rather than an empty grid', async () => {
    fetchPresence.mockResolvedValue({ rows: [] });
    renderStrip();

    expect(await screen.findByText('Nobody on the roster yet')).toBeInTheDocument();
  });

  it('offers a retry when the presence request fails', async () => {
    fetchPresence.mockRejectedValue(
      Object.assign(new Error('Could not reach the server.'), { requestId: 'req_4' }),
    );
    renderStrip();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
