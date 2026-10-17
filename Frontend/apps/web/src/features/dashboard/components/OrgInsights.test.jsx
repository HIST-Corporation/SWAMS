// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { OrgInsights } from './OrgInsights.jsx';
import { fetchOrgDashboard } from '../api.js';

vi.mock('../api.js', () => ({ fetchOrgDashboard: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const renderPanel = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <OrgInsights />
      </I18nextProvider>
    </QueryClientProvider>,
  );

const board = (insights) => ({ insights });

describe('OrgInsights', () => {
  it("renders the panel copy from the server's i18n keys, never the key itself", async () => {
    fetchOrgDashboard.mockResolvedValue(
      board([
        {
          id: 'ins_predict',
          kind: 'predict',
          titleKey: 'insight.predict.title',
          bodyKey: 'insight.predict.body',
          params: { count: 3 },
        },
      ]),
    );
    renderPanel();

    expect(await screen.findByText('Predicted late arrivals')).toBeInTheDocument();
    // The numbers in the sentence are the server's params, not baked copy.
    expect(screen.getByText(/3 people are likely to arrive late/)).toBeInTheDocument();
    expect(screen.queryByText(/^insight\./)).toBeNull();
  });

  it('puts the server figures into the trend sentence', async () => {
    fetchOrgDashboard.mockResolvedValue(
      board([
        {
          id: 'ins_trend',
          kind: 'trend',
          titleKey: 'insight.trend.title',
          bodyKey: 'insight.trend.body',
          params: { delta: 4.2, rate: 96, team: 'Engineering' },
        },
      ]),
    );
    renderPanel();

    expect(
      await screen.findByText(
        'The overall rate is up 4.2% on last month; Engineering leads at 96%.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the designed empty state instead of a bare card', async () => {
    fetchOrgDashboard.mockResolvedValue(board([]));
    renderPanel();

    expect(await screen.findByText('No insights yet')).toBeInTheDocument();
    expect(screen.getByText(/as patterns emerge/i)).toBeInTheDocument();
  });

  it('offers a retry when the board request fails', async () => {
    fetchOrgDashboard.mockRejectedValue(
      Object.assign(new Error('Could not reach the server.'), { requestId: 'req_9' }),
    );
    renderPanel();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
