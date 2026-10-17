// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { AuditPage } from './AuditPage.jsx';
import { fetchAuditEntries } from '../api.js';

vi.mock('../api.js', () => ({ fetchAuditEntries: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const PAGE_ONE = {
  rows: [
    {
      id: 'aud_01',
      actor: 'Sita Shrestha',
      entity: 'leave',
      action: 'leaveApproved',
      createdAt: '2026-10-10T04:05:00.000Z',
    },
    {
      id: 'aud_02',
      actor: 'Ramesh Adhikari',
      entity: 'attendance',
      action: 'correctionApproved',
      createdAt: '2026-10-09T02:12:00.000Z',
    },
  ],
  page: 1,
  perPage: 10,
  total: 12,
  totalPages: 2,
};

function renderAudit() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <AuditPage />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists entries with the actor, the action sentence and the entity', async () => {
    fetchAuditEntries.mockResolvedValue(PAGE_ONE);
    renderAudit();

    // The filter select carries the same action labels — scope rows to the list.
    const list = await screen.findByRole('list');
    expect(within(list).getByText('Sita Shrestha')).toBeInTheDocument();
    expect(within(list).getByText('Approved a leave request.')).toBeInTheDocument();
    // The entity word renders inside the meta line (ul > li > p also match it).
    expect(within(list).getAllByText(/Leave/).length).toBeGreaterThan(0);
    expect(screen.getByText(/of 2/)).toBeInTheDocument();
  });

  it('moves to the next page through the server, not the cached set', async () => {
    fetchAuditEntries.mockResolvedValue(PAGE_ONE);
    const user = userEvent.setup();
    renderAudit();

    await screen.findByText('Sita Shrestha');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(fetchAuditEntries).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, perPage: 10 }),
      );
    });
  });

  it('resets to page one when a filter changes', async () => {
    fetchAuditEntries.mockResolvedValue(PAGE_ONE);
    const user = userEvent.setup();
    renderAudit();

    await screen.findByText('Sita Shrestha');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(fetchAuditEntries).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );

    await user.selectOptions(screen.getByLabelText(/action/i), 'userInvited');
    await waitFor(() => {
      expect(fetchAuditEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, action: 'userInvited' }),
      );
    });
  });

  it('shows the designed empty state when no entry matches', async () => {
    fetchAuditEntries.mockResolvedValue({ ...PAGE_ONE, rows: [], total: 0, totalPages: 1 });
    renderAudit();

    expect(await screen.findByText('No audit entries')).toBeInTheDocument();
    expect(screen.getByText(/matching these filters/i)).toBeInTheDocument();
  });

  it('offers a retry when the request fails', async () => {
    fetchAuditEntries
      .mockRejectedValueOnce(
        Object.assign(new Error('Could not reach the server.'), { requestId: 'req_20' }),
      )
      .mockResolvedValue({ ...PAGE_ONE, rows: [], total: 0, totalPages: 1 });
    const user = userEvent.setup();
    renderAudit();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('No audit entries')).toBeInTheDocument();
  });
});
