// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { initI18n } from '@swams/i18n';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm.jsx';
import { requestPasswordReset } from '../../../lib/authApi.js';

// Only the reset request is faked; the form flow itself stays real and no
// unit test may touch the network (same rule as LoginPage.test.jsx).
vi.mock('../../../lib/authApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  requestPasswordReset: vi.fn(),
}));

initI18n({ lng: 'en' });

beforeEach(() => {
  requestPasswordReset.mockReset();
});

/** A promise the test resolves by hand, so the in-flight state is observable. */
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('ForgotPasswordForm', () => {
  it('shows the reset-request form in the idle state', () => {
    render(<ForgotPasswordForm onBack={vi.fn()} />);
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    // Enabled on purpose: validation happens on submit so invalid input can
    // still produce an inline error (LoginPage test: "blocks a malformed…").
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an inline error and sends nothing when the email is invalid', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm onBack={vi.fn()} />);

    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email address/i);
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows a sending button while the request is in flight', async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred();
    requestPasswordReset.mockImplementation(() => promise);

    render(<ForgotPasswordForm onBack={vi.fn()} />);
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled();
    // A second click while in flight must not fire a second request.
    await user.click(screen.getByRole('button', { name: /sending/i }));
    expect(requestPasswordReset).toHaveBeenCalledTimes(1);

    resolve({ status: 'sent' });
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('shows an enumeration-safe confirmation when the request completes', async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockResolvedValue({ status: 'sent' });

    render(<ForgotPasswordForm onBack={vi.fn()} />);
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: 'sita@himaldigital.com.np',
    });
    const confirmation = await screen.findByRole('status');
    expect(confirmation).toHaveTextContent(/check your email/i);
    // Never confirms the account exists (Section 8.9: honest copy).
    expect(confirmation).toHaveTextContent(/if an account exists/i);
  });

  it('reports a failed request inline without leaving the form', async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockRejectedValue(new Error('network down'));

    render(<ForgotPasswordForm onBack={vi.fn()} />);
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't send/i);
    // The typed value survives a recoverable failure.
    expect(screen.getByLabelText(/work email/i)).toHaveValue('sita@himaldigital.com.np');
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('calls onBack from both the form and the confirmation, and a remount is empty', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const { unmount } = render(<ForgotPasswordForm onBack={onBack} />);

    // From the idle form.
    await user.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalledTimes(1);

    // From the confirmation, after a successful request.
    requestPasswordReset.mockResolvedValue({ status: 'sent' });
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalledTimes(2);

    // The parent unmounts this view; a fresh mount starts with a clean field.
    unmount();
    render(<ForgotPasswordForm onBack={onBack} />);
    expect(screen.getByLabelText(/work email/i)).toHaveValue('');
  });
});
