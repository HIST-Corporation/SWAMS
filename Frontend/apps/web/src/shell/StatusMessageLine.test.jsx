// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { StatusMessageLine } from './StatusMessageLine.jsx';
import { MESSAGE_STORAGE_KEY, STATUS_PRESETS, usePresenceStore } from '../stores/presence.js';

const i18n = initI18n({ lng: 'en' });

/** The English label a preset id renders, for matching by accessible name. */
const labelOf = (id) => i18n.t(`nav:nav.statusMessage.presets.${id}`);

function renderLine() {
  return render(
    <I18nextProvider i18n={i18n}>
      <StatusMessageLine />
    </I18nextProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  usePresenceStore.setState({ statusMessage: '' });
});

afterEach(() => {
  window.localStorage.clear();
  usePresenceStore.setState({ statusMessage: '' });
});

describe('StatusMessageLine', () => {
  it('shows the placeholder prompt when no status is set', () => {
    renderLine();
    expect(screen.getByRole('button', { name: /add a status/i })).toBeInTheDocument();
  });

  it('opens a menu of preset statuses to choose from (a picklist, not typing)', async () => {
    const user = userEvent.setup();
    renderLine();

    await user.click(screen.getByRole('button', { name: /add a status/i }));

    const menu = await screen.findByRole('menu', { name: /status message/i });
    // No free-text input anywhere — the only inputs are the preset options.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    for (const id of STATUS_PRESETS) {
      const option = within(menu).getByRole('menuitemradio', { name: new RegExp(labelOf(id), 'i') });
      expect(option).toBeInTheDocument();
    }
  });

  it('selecting a preset stores its id and shows the label as the third line', async () => {
    const user = userEvent.setup();
    renderLine();

    await user.click(screen.getByRole('button', { name: /add a status/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /In a meeting/i }));

    expect(await screen.findByRole('button', { name: /In a meeting/i })).toBeInTheDocument();
    expect(usePresenceStore.getState().statusMessage).toBe('in_a_meeting');
    expect(window.localStorage.getItem(MESSAGE_STORAGE_KEY)).toBe('in_a_meeting');
  });

  it('marks the chosen preset as checked inside the menu', async () => {
    const user = userEvent.setup();
    usePresenceStore.setState({ statusMessage: 'deep_work' });
    renderLine();

    await user.click(screen.getByRole('button', { name: /Deep work/i }));
    const chosen = await screen.findByRole('menuitemradio', { name: /Deep work/i });
    expect(chosen).toHaveAttribute('aria-checked', 'true');
  });

  it('clear empties the message and returns to the placeholder', async () => {
    const user = userEvent.setup();
    usePresenceStore.setState({ statusMessage: 'on_leave' });
    renderLine();

    await user.click(screen.getByRole('button', { name: /On leave/i }));
    await user.click(await screen.findByRole('menuitem', { name: /clear status/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add a status/i })).toBeInTheDocument(),
    );
    expect(usePresenceStore.getState().statusMessage).toBe('');
    expect(window.localStorage.getItem(MESSAGE_STORAGE_KEY)).toBe('');
  });

  it('closes the menu on Escape without changing the selection', async () => {
    const user = userEvent.setup();
    usePresenceStore.setState({ statusMessage: 'focusing' });
    renderLine();

    await user.click(screen.getByRole('button', { name: /Focusing/i }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(usePresenceStore.getState().statusMessage).toBe('focusing');
  });
});
