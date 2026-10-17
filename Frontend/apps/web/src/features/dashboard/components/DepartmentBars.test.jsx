// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n } from '@swams/i18n';
import { DepartmentBars } from './DepartmentBars.jsx';
import { fetchOrgDashboard } from '../api.js';

vi.mock('../api.js', () => ({ fetchOrgDashboard: vi.fn() }));

const i18n = initI18n({ lng: 'en' });

const renderPanel = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={i18n}>
        <DepartmentBars />
      </I18nextProvider>
    </QueryClientProvider>,
  );

describe('DepartmentBars', () => {
  it('prints every rate as text, so the bar is never the only signal', async () => {
    fetchOrgDashboard.mockResolvedValue({
      departments: [
        { id: 'd1', name: 'Engineering', rate: 96, tone: 'indigo' },
        { id: 'd2', name: 'Finance', rate: 79, tone: 'rose' },
      ],
    });
    renderPanel();

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('79%')).toBeInTheDocument();
  });

  it('fills each bar to its own rate and hides the strip from assistive tech', async () => {
    fetchOrgDashboard.mockResolvedValue({
      departments: [{ id: 'd1', name: 'Engineering', rate: 96, tone: 'indigo' }],
    });
    const { container } = renderPanel();

    await screen.findByText('Engineering');
    const fill = container.querySelector('[aria-hidden="true"] > div');
    expect(fill).toHaveStyle({ width: '96%' });
  });

  it('shows the designed empty state, not an empty list', async () => {
    fetchOrgDashboard.mockResolvedValue({ departments: [] });
    renderPanel();

    expect(await screen.findByText('No departments yet')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});
