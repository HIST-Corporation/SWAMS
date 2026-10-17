// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { NotificationBell } from './NotificationBell.jsx';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api.js';

vi.mock('../api.js', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

const i18n = initI18n({ lng: 'en' });

const UNREAD = {
  id: 'n1',
  kind: 'leave',
  key: 'leaveRequested',
  params: { name: 'Anita Thapa' },
  createdAt: new Date().toISOString(),
  read: false,
  link: '/leave',
};
const READ = {
  id: 'n2',
  kind: 'system',
  key: 'passwordChanged',
  params: {},
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  read: true,
  link: null,
};

function renderBell() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/']}>
          <NotificationBell />
          <Routes>
            <Route path="/" element={null} />
            <Route path="/leave" element={<p>leave-route</p>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

const openPanel = async (user) => {
  const trigger = await screen.findByRole('button', { name: /notifications/i });
  await user.click(trigger);
  return trigger;
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names the trigger with the unread count and lists rows when opened', async () => {
    fetchNotifications.mockResolvedValue({ rows: [UNREAD, READ] });
    const user = userEvent.setup();
    renderBell();

    const trigger = await screen.findByRole('button', {
      name: 'Notifications, 1 unread',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(await screen.findByText('Anita Thapa requested time off.')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Unread is announced in words, never colour alone (§8.9).
    expect(screen.getAllByText('Unread').length).toBeGreaterThan(0);
    // Read rows carry no unread announcement.
    expect(screen.getByText('Your account password was changed.')).toBeInTheDocument();
  });

  it('marks everything read, clears the badge and never fakes the API call', async () => {
    fetchNotifications
      .mockResolvedValueOnce({ rows: [UNREAD, READ] })
      .mockResolvedValue({ rows: [UNREAD, READ].map((row) => ({ ...row, read: true })) });
    markAllNotificationsRead.mockResolvedValue({ updated: 1 });
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);
    await user.click(screen.getByRole('button', { name: /mark all as read/i }));

    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
    // The refetch lands with everything read → the badge disappears.
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeEnabled();
  });

  it('opens a row link, marks it read on the way out and closes the panel', async () => {
    fetchNotifications.mockResolvedValue({ rows: [UNREAD, READ] });
    markNotificationRead.mockResolvedValue({ record: { ...UNREAD, read: true } });
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);
    await user.click(screen.getByText('Anita Thapa requested time off.'));

    // react-query passes a context object as mutationFn's second argument.
    expect(markNotificationRead.mock.calls[0][0]).toBe('n1');
    expect(await screen.findByText('leave-route')).toBeInTheDocument();
    // Panel closed after navigating.
    expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull();
  });

  it('shows the designed empty state when there is nothing to show', async () => {
    fetchNotifications.mockResolvedValue({ rows: [] });
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    // Nothing unread → the trigger falls back to the plain name.
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('offers a retry when the request fails', async () => {
    fetchNotifications
      .mockRejectedValueOnce(
        Object.assign(new Error('Could not reach the server.'), { requestId: 'req_9' }),
      )
      .mockResolvedValue({ rows: [] });
    const user = userEvent.setup();
    renderBell();

    await openPanel(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not reach the server.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    fetchNotifications.mockResolvedValue({ rows: [UNREAD] });
    const user = userEvent.setup();
    renderBell();

    const trigger = await openPanel(user);
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Notifications' })).toBeNull(),
    );
    expect(trigger).toHaveFocus();
  });
});
