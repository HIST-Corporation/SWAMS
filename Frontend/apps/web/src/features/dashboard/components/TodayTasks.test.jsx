// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { TodayTasks } from './TodayTasks.jsx';
import { fetchTodayTasks } from '../api.js';

vi.mock('../api.js', () => ({ fetchTodayTasks: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const renderTask = (enabled = true) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <TodayTasks enabled={enabled} />
      </I18nextProvider>
    </QueryClientProvider>,
  );

describe('TodayTasks', () => {
  it('renders nothing when the org lacks the tasks entitlement', () => {
    renderTask(false);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(fetchTodayTasks).not.toHaveBeenCalled();
  });

  it('lists tasks with a date and a text status', async () => {
    fetchTodayTasks.mockResolvedValue({
      rows: [{ id: 't1', title: 'Send invoice export', due: '2026-10-14', status: 'in_progress' }],
    });
    renderTask();

    expect(await screen.findByText('Send invoice export')).toBeInTheDocument();
    expect(screen.getByText('Due 14 Oct 2026')).toBeInTheDocument();
    // status is words, not colour alone (Section 8.9)
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('shows the designed empty state, not a blank list', async () => {
    fetchTodayTasks.mockResolvedValue({ rows: [] });
    renderTask();

    expect(await screen.findByText('Nothing due today')).toBeInTheDocument();
    expect(screen.getByText(/appear here/i)).toBeInTheDocument();
  });

  it('offers a retry when the tasks request fails', async () => {
    fetchTodayTasks.mockRejectedValue(
      Object.assign(new Error('Could not reach the server.'), { requestId: 'req_7' }),
    );
    renderTask();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
