// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { initI18n } from '@swams/i18n';
import { ThemeProvider } from '@swams/ui';
import { LoginPage } from './LoginPage.jsx';
import { SessionContext } from '../SessionContext.js';
import { requestPasswordReset } from '../../../lib/authApi.js';

// Only the reset request is faked — the session machine stays real in these
// tests, and no unit test should touch the network.
vi.mock('../../../lib/authApi.js', async (importOriginal) => ({
  ...(await importOriginal()),
  requestPasswordReset: vi.fn(),
}));

initI18n();

beforeEach(() => {
  window.localStorage.clear();
  requestPasswordReset.mockReset();
});

/** Render LoginPage with a stubbed session context (no machine). */
function renderLogin(auth) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      {/* ThemeProvider backs the ThemeToggle on the sign-in screen (useTheme
          throws without a provider). */}
      <ThemeProvider>
        <SessionContext.Provider value={auth}>
          <LoginPage />
        </SessionContext.Provider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

const base = {
  status: 'anonymous',
  isAuthenticated: false,
  lastError: null,
  signIn: vi.fn(),
  verifyMfa: vi.fn(),
  cancelMfa: vi.fn(),
  signOut: vi.fn(),
};

describe('LoginPage', () => {
  it('submits valid credentials through the session machine', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn();
    renderLogin({ ...base, signIn });

    // The form opens autofilled, so a hand-typed address replaces it.
    await user.clear(screen.getByLabelText(/work email/i));
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    // Anchored: /password/i would also match the eye toggle ("Show password").
    await user.clear(screen.getByLabelText(/^password/i));
    await user.type(screen.getByLabelText(/^password/i), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // The prototype opens on the HR tab, so that is the default portal.
    expect(signIn).toHaveBeenCalledWith({
      email: 'sita@himaldigital.com.np',
      password: 'correct-horse-1',
      portal: 'hr',
    });
  });

  it('opens on the HR demo account, autofilled, with no credentials list', () => {
    renderLogin(base);

    // The prototype's DEMO CREDENTIALS card is gone (owner's call) — the form
    // itself carries the account, so one click signs in.
    expect(screen.queryByRole('heading', { name: /demo credentials/i })).toBeNull();
    expect(screen.getByLabelText(/work email/i)).toHaveValue('sarah@swams.com');
    expect(screen.getByLabelText(/^password/i)).toHaveValue('password');
    // …and the screen still says those credentials are demo data (§9.6).
    expect(screen.getByText(/demo credentials are filled in/i)).toBeInTheDocument();
  });

  it('signs in with the autofilled demo account without typing anything', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn();
    renderLogin({ ...base, signIn });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signIn).toHaveBeenCalledWith({
      email: 'sarah@swams.com',
      password: 'password',
      portal: 'hr',
    });
  });

  it('swaps the whole demo account when the role or persona changes', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    // Staff tab → that tab's default persona, password included.
    await user.click(screen.getByRole('radio', { name: /^staff$/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('priya@swams.com');
    expect(screen.getByLabelText(/^password/i)).toHaveValue('password');

    // Each role card is its own demo account — the mock reads the email.
    await user.click(screen.getByRole('radio', { name: /backend dev/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('james@swams.com');

    await user.click(screen.getByRole('radio', { name: /qa engineer/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('tina@swams.com');

    // Back to Administration: the HR demo account comes back.
    await user.click(screen.getByRole('radio', { name: /administration/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('sarah@swams.com');
  });

  it('shows inline errors for an invalid email and short password', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    await user.clear(screen.getByLabelText(/work email/i));
    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.clear(screen.getByLabelText(/^password/i));
    await user.type(screen.getByLabelText(/^password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Exact copy: no other line on the screen says "valid email" any more.
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(base.signIn).not.toHaveBeenCalled();
  });

  it('renders the MFA challenge state from the machine', () => {
    renderLogin({ ...base, status: 'mfaRequired' });
    expect(screen.getByText(/two-step verification/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it('sends VERIFY_MFA with a valid 6-digit code', async () => {
    const user = userEvent.setup();
    const verifyMfa = vi.fn();
    renderLogin({ ...base, status: 'mfaRequired', verifyMfa });

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(verifyMfa).toHaveBeenCalledWith({ code: '123456', portal: 'hr' });
  });

  it('blocks a malformed MFA code with an inline error', async () => {
    const user = userEvent.setup();
    renderLogin({ ...base, status: 'mfaRequired' });

    await user.type(screen.getByLabelText(/verification code/i), '12');
    await user.click(screen.getByRole('button', { name: /verify and sign in/i }));

    // The FormField error is the only alert in the MFA view (the subtitle
    // also contains "6-digit code", so query by role, not text).
    expect(await screen.findByRole('alert')).toHaveTextContent(/6-digit code/i);
    expect(base.verifyMfa).not.toHaveBeenCalled();
  });

  it('shows the sign-in failure alert when the machine stores an error', () => {
    renderLogin({ ...base, lastError: { message: 'bad credentials' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/didn't match/i);
  });

  it('reveals and hides the password through the eye toggle', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    const field = screen.getByLabelText(/^password/i);
    expect(field).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('type', 'password');
  });

  it('stores email + portal under Remember me and prefills them next visit', async () => {
    const user = userEvent.setup();
    const signIn = vi.fn();
    const first = renderLogin({ ...base, signIn });

    await user.clear(screen.getByLabelText(/work email/i));
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    await user.clear(screen.getByLabelText(/^password/i));
    await user.type(screen.getByLabelText(/^password/i), 'correct-horse-1');
    await user.click(screen.getByRole('radio', { name: /staff/i }));
    await user.click(screen.getByRole('checkbox', { name: /remember me/i }));
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signIn).toHaveBeenCalled();
    // The picker's default is HR, so switching to Staff is the choice worth
    // storing — it is what the next visit has to restore.
    expect(JSON.parse(window.localStorage.getItem('swams.remember'))).toEqual({
      email: 'sita@himaldigital.com.np',
      portal: 'staff',
      // The chosen staff persona is part of what the next visit restores.
      persona: 'staff',
    });

    // Next visit: the form comes back prefilled and the box still checked.
    first.unmount();
    renderLogin(base);
    expect(screen.getByLabelText(/work email/i)).toHaveValue('sita@himaldigital.com.np');
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: /staff/i })).toBeChecked();
  });

  it('never overwrites a hand-typed address with a demo one', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    await user.click(screen.getByRole('radio', { name: /^staff$/i }));
    await user.clear(screen.getByLabelText(/work email/i));
    await user.type(screen.getByLabelText(/work email/i), 'someone@company.com');

    // Switching persona must not silently replace a real-looking address.
    await user.click(screen.getByRole('radio', { name: /devops/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('someone@company.com');
  });

  it('offers the six-role persona cards and swaps the demo account with them', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    // Management portal: four of the six core roles as cards (Executive, HR,
    // Dept. Manager, Team Lead) — platform super_admin lives in apps/console.
    expect(screen.getByRole('radio', { name: /executive/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /dept\. manager/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /team lead/i })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /executive/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('aarav@swams.com');
    await user.click(screen.getByRole('radio', { name: /team lead/i }));
    expect(screen.getByLabelText(/work email/i)).toHaveValue('anita@swams.com');

    // Staff portal shows the four staff personas instead.
    await user.click(screen.getByRole('radio', { name: /^staff$/i }));
    expect(screen.queryByRole('radio', { name: /executive/i })).toBeNull();
    expect(screen.getByRole('radio', { name: /backend dev/i })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /administration/i }));
    expect(screen.queryByRole('radio', { name: /backend dev/i })).toBeNull();
    // Back on the management portal, its own cards are back.
    expect(screen.getByRole('radio', { name: /executive/i })).toBeInTheDocument();
  });

  it('clears the remembered login when Remember me is left unchecked', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'swams.remember',
      JSON.stringify({ email: 'old@himaldigital.com.np', portal: 'staff' }),
    );
    const { unmount } = renderLogin({ ...base, signIn: vi.fn() });

    // Prefilled from storage, box checked by default → uncheck and submit.
    await user.click(screen.getByRole('checkbox', { name: /remember me/i }));
    await user.type(screen.getByLabelText(/^password/i), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(window.localStorage.getItem('swams.remember')).toBeNull();
    unmount();
  });

  it('swaps to the forgot-password view and returns via Back to sign in', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();

    await user.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(screen.getByRole('radio', { name: /administration/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('blocks a malformed reset email before any request is sent', async () => {
    const user = userEvent.setup();
    renderLogin(base);

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    // Exact copy: the hint under the button also says "valid email".
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('shows the enumeration-safe confirmation after a reset request', async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockResolvedValue({ status: 'sent' });
    renderLogin(base);

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
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

  it('reports a failed reset request inline without leaving the view', async () => {
    const user = userEvent.setup();
    requestPasswordReset.mockRejectedValue(new Error('network down'));
    renderLogin(base);

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    await user.type(screen.getByLabelText(/work email/i), 'sita@himaldigital.com.np');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't send/i);
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });
});
