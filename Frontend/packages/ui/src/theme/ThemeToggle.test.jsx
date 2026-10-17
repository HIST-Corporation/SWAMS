// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, ThemeToggle, THEME_STORAGE_KEY } from '../index.js';
import { initI18n } from '@swams/i18n';

initI18n();

function setup(onPersist) {
  return render(
    <ThemeProvider onPersist={onPersist}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('offers Light, Dark and System (Section 8.3)', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /theme/i }));
    for (const option of ['Light', 'Dark', 'System']) {
      expect(await screen.findByRole('menuitemradio', { name: new RegExp(option) })).toBeTruthy();
    }
  });

  it('defaults to System and follows the OS preference', async () => {
    setup();
    await waitFor(() =>
      expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme')),
    );
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('applies Dark immediately and persists the choice', async () => {
    const onPersist = vi.fn();
    const user = userEvent.setup();
    setup(onPersist);

    await user.click(screen.getByRole('button', { name: /theme/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /Dark/ }));

    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(onPersist).toHaveBeenCalledWith('dark');
  });

  it('restores a stored preference on mount', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    setup();
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('light'));
  });
});
