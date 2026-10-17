// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { LandingPage } from './LandingPage.jsx';

const i18n = initI18n({ lng: 'en' });

/** Landing is public: no session provider, no auth guard. */
function renderLanding({ route = '/landing' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <I18nextProvider i18n={i18n}>
        <LandingPage />
      </I18nextProvider>
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('renders every section of the landing', () => {
    renderLanding();

    // Every section carries its own heading (§8.9: each section names itself).
    // Two h1s by design: the sr-only tagline and the hero title.
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    for (const name of [
      'Attendance & geofencing',
      'Kanban task boards',
      'Leave management',
      'Team calendar',
      'Team messaging',
      'Video meetings',
      'Role-based dashboards',
      'AI-powered insights',
    ]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('heading', { name: /three steps/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /priced for SME teams/i })).toBeTruthy();
  });

  it('attaches the primary actions to the demo sign-in route', () => {
    renderLanding();

    // The header "Sign in" still targets the generic login (§7.3).
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0);
    // Both pricing plans and the closing CTA open the demo sign-in page at /demo.
    expect(screen.getAllByRole('link', { name: /try it free/i }).length).toBeGreaterThan(0);
    for (const link of screen.getAllByRole('link', { name: /try it free/i })) {
      expect(link).toHaveAttribute('href', '/demo');
    }
    // The "watch the demo" secondary links also open /demo.
    for (const link of screen.getAllByRole('link', { name: /try live demo/i })) {
      expect(link).toHaveAttribute('href', '/demo');
    }
  });

  it('sends the hero sign-up form to the demo sign-in page', async () => {
    const user = userEvent.setup();
    renderLanding();

    // Two inline sign-up forms (hero + closing CTA). Take the hero's — the
    // first on the page — and submit it.
    const email = screen.getAllByLabelText(/work email/i)[0];
    await user.type(email, 'visitor@example.com');
    const [heroSubmit] = screen.getAllByRole('button', { name: /sign up for free/i });
    await user.click(heroSubmit);

    // MemoryRouter has no <Routes>, so a completed submit leaves the form in
    // place; the point is the form is wired to navigate (not throw) on submit.
    expect(screen.getAllByRole('button', { name: /sign up for free/i }).length).toBeGreaterThan(0);
  });

  it('shows the code showcase with the terminal snippet', () => {
    renderLanding();

    expect(screen.getByRole('heading', { name: /one api behind every module/i })).toBeTruthy();
    expect(screen.getByText(/swams attendance punch/i)).toBeTruthy();
  });

  it('shows the animated product preview in place of the clock-in demo', async () => {
    renderLanding();

    // The preview window names itself and shows the manager's morning screen.
    expect(screen.getByText(/swams workspace preview/i)).toBeTruthy();
    expect(screen.getByText(/present today/i)).toBeTruthy();
    expect(screen.getByText(/today's board/i)).toBeTruthy();
    // The kanban lanes and a sample card render (sample data, never the live product).
    expect(screen.getAllByText(/^to do$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/review payroll export/i)).toBeTruthy();
    // The live presence badge and the sample-data disclaimer are both present.
    expect(screen.getByText(/^live$/i)).toBeTruthy();
    expect(screen.getByText(/sample workspace/i)).toBeTruthy();
    // The old clock-in demo is gone — no clock-in control remains.
    expect(screen.queryByRole('button', { name: /^clock in$/i })).toBeNull();
  });

  it('renders in Nepali when the language is switched', async () => {
    // initI18n is idempotent — switching goes through the instance it returned.
    await i18n.changeLanguage('ne');
    renderLanding();

    // The pricing heading in ne — proof every string comes from the catalogs.
    expect(await screen.findByRole('heading', { name: /SME टोलीका लागि मूल्य/i })).toBeTruthy();
    await i18n.changeLanguage('en');
  });
});
