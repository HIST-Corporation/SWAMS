// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, THEME_STORAGE_KEY } from '@swams/ui';
import { initI18n } from '@swams/i18n';
import { SettingsPage } from './SettingsPage.jsx';
import { persistLanguage } from '../../../lib/persistPreferences.js';

vi.mock('../../../lib/persistPreferences.js', () => ({
  persistTheme: vi.fn(() => Promise.resolve(true)),
  persistLanguage: vi.fn(() => Promise.resolve(true)),
}));

const i18n = initI18n({ lng: 'en' });

function renderSettings(onPersist) {
  return render(
    <ThemeProvider onPersist={onPersist}>
      <I18nextProvider i18n={i18n}>
        <SettingsPage />
      </I18nextProvider>
    </ThemeProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
    window.localStorage.clear();
  });

  it('switches the theme, persists it and confirms the save', async () => {
    const onPersist = vi.fn(() => Promise.resolve(true));
    const user = userEvent.setup();
    renderSettings(onPersist);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(onPersist).toHaveBeenCalledWith('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(await screen.findByRole('status')).toHaveTextContent('Preference saved.');
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
  });

  it('reports honestly when the profile rejected the theme change', async () => {
    const onPersist = vi.fn(() => Promise.resolve(false));
    const user = userEvent.setup();
    renderSettings(onPersist);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Couldn't save to your profile — the choice is kept on this device.",
    );
    // The local choice still wins (Section 8.3).
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('switches the interface to Nepali and stores the choice', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('radio', { name: 'नेपाली' }));

    expect(persistLanguage).toHaveBeenCalledWith('ne');
    expect(window.localStorage.getItem('swams.language')).toBe('ne');
    await waitFor(() => expect(i18n.language).toBe('ne'));
    // The page itself re-renders in Nepali — headings included.
    expect(await screen.findByRole('heading', { name: 'सेटिङहरू' })).toBeInTheDocument();
  });

  it('keeps both choices as radios so either can be reached by keyboard', () => {
    renderSettings();
    for (const name of ['Light', 'Dark', 'System']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'नेपाली' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  });
});
