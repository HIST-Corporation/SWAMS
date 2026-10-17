// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initI18n } from '@swams/i18n';
import { ThemeProvider } from '@swams/ui';
import { ConsoleRoot } from './ConsoleRoot.jsx';

initI18n();

/** Render the console exactly as main.jsx does — theme shell and all. */
function renderConsole() {
  return render(
    <ThemeProvider>
      <ConsoleRoot />
    </ThemeProvider>,
  );
}

/**
 * The console's auth gate and shell (six-role model: platform administration
 * is its own application and auth realm). These tests prove the gate works
 * and that fixture-backed sections are honestly labelled — they do NOT make
 * the mock session a security boundary (the backend must, contract 31).
 */
describe('console', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens on the platform sign-in gate, not the admin content', () => {
    renderConsole();
    expect(screen.getByRole('heading', { name: /platform sign-in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/admin email/i)).toHaveValue('admin@swams.com');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('rejects wrong credentials inline and never opens the console', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.clear(screen.getByLabelText(/^password/i));
    await user.type(screen.getByLabelText(/^password/i), 'not-the-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/didn't match/i);
    expect(screen.getByRole('heading', { name: /platform sign-in/i })).toBeInTheDocument();
  });

  it('signs in with the demo admin and labels the fixtures out loud', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // The shell opens on the overview with the honest-mock banner visible.
    expect(screen.getByRole('navigation', { name: /console sections/i })).toBeInTheDocument();
    expect(screen.getByText('Development fixtures')).toBeInTheDocument();
    expect(screen.getByText(/sample data, never live tenants/i)).toBeInTheDocument();

    // Sections switch without a router and each renders its own fixture data.
    await user.click(screen.getByRole('button', { name: /organizations/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /himal digital/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /system health/i }));
    expect(screen.getByText(/notification jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/degraded/i)).toBeInTheDocument();
  });

  it('the console session is cleared by sign out — the gate comes back', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('navigation', { name: /console sections/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(screen.getByRole('heading', { name: /platform sign-in/i })).toBeInTheDocument();
    expect(window.localStorage.getItem('swams.console.session')).toBeNull();
  });
});
