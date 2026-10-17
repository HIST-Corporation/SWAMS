// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { initI18n } from '@swams/i18n';
import { OrgSetupWizard } from './OrgSetupWizard.jsx';

vi.mock('../../../lib/apiClient.js', () => ({
  api: { post: vi.fn() },
}));

import { api } from '../../../lib/apiClient.js';

initI18n();

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <OrgSetupWizard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  api.post.mockResolvedValue({ data: { org: { id: 'org_x', name: 'Himal Digital' } } });
});

describe('OrgSetupWizard', () => {
  it('renders step 1 with the organization name field', () => {
    renderWizard();
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    // The number lives in its own span, so match on the li's text.
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('1.');
    expect(items[0]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).toHaveTextContent('Organization');
  });

  it('blocks Continue without a name and shows the inline error only after the attempt', async () => {
    const user = userEvent.setup();
    renderWizard();
    // No red fields on first paint (machine `attempted` flag).
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/organization name/i);
  });

  it('walks all four steps and submits the draft', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/organization name/i), 'Himal Digital');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: sites
    expect(await screen.findByLabelText(/work sites/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/baneshwor/i), 'Baneshwor');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: calendar + fiscal year (defaults valid)
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 4: review
    expect(screen.getByText(/baneshwor/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /finish setup/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/org/setup',
        expect.objectContaining({
          name: 'Himal Digital',
          sites: ['Baneshwor'],
        }),
      ),
    );
    expect(await screen.findByText(/workspace is ready/i)).toBeInTheDocument();
  });

  it('surfaces a submit failure with a retry (error state)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(new Error('boom'));
    renderWizard();

    await user.type(screen.getByLabelText(/organization name/i), 'Himal Digital');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(await screen.findByPlaceholderText(/baneshwor/i), 'Baneshwor');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /finish setup/i }));

    expect(await screen.findByText(/couldn't save/i)).toBeInTheDocument();
    // Back on review: retry is possible (SUBMIT again).
    expect(screen.getByRole('button', { name: /finish setup/i })).toBeEnabled();
  });

  it('Back returns to the previous step', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByLabelText(/organization name/i), 'Himal Digital');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(await screen.findByRole('button', { name: /back/i }));
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
  });
});
