// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { CorrectionQueue } from './CorrectionQueue.jsx';
import { decideCorrection } from '../api.js';

vi.mock('../api.js', () => ({
  decideCorrection: vi.fn(),
  submitCorrection: vi.fn(),
}));

let i18n;
beforeAll(() => {
  i18n = initI18n({ lng: 'en' });
});

beforeEach(() => {
  decideCorrection.mockReset();
  decideCorrection.mockResolvedValue({ record: { id: 'corr_1', status: 'approved' } });
});

const row = {
  id: 'corr_1',
  requester: 'Prakash Gurung',
  date: '2026-10-04',
  original: { clockIn: '09:38', clockOut: '16:20' },
  proposed: { clockIn: '09:02', clockOut: '16:20' },
  reason: 'Late arrival at the gate.',
  status: 'in_review',
  note: null,
};

const renderQueue = (rows = [row]) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <CorrectionQueue rows={rows} />
      </I18nextProvider>
    </QueryClientProvider>,
  );

describe('CorrectionQueue', () => {
  it('shows both sides of the request so nobody approves unseen values', () => {
    renderQueue();
    expect(screen.getByText('Prakash Gurung')).toBeTruthy();
    expect(screen.getByText('09:38 → 16:20')).toBeTruthy();
    expect(screen.getByText('09:02 → 16:20')).toBeTruthy();
    expect(screen.getByText('In review')).toBeTruthy();
  });

  it('renders the empty bench rather than an empty list', () => {
    renderQueue([]);
    expect(screen.getByText('No requests waiting.')).toBeTruthy();
  });

  it('approves without a note and mirrors the server status', async () => {
    renderQueue();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(decideCorrection).toHaveBeenCalledWith({ id: 'corr_1', decision: 'approve' }),
    );
    expect(await screen.findByText('Approved')).toBeTruthy();
  });

  it('asks for a note before rejecting — the API refuses a bare reject', async () => {
    renderQueue();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    const send = screen.getByRole('button', { name: 'Reject' });
    expect(send).toBeDisabled();
    expect(decideCorrection).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Check with the site.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() =>
      expect(decideCorrection).toHaveBeenCalledWith({
        id: 'corr_1',
        decision: 'reject',
        note: 'Check with the site.',
      }),
    );
  });

  it('keeps the row readable and offers a retry when the decision fails', async () => {
    decideCorrection.mockRejectedValueOnce(
      Object.assign(new Error('That changed while you were working.'), { requestId: 'req_9' }),
    );
    renderQueue();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('That changed while you were working.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    // the request itself is still on screen, so the reviewer can re-read it
    expect(screen.getByText('09:38 → 16:20')).toBeTruthy();
  });
});
