// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './CommandPalette.jsx';
import { initI18n } from '@swams/i18n';

initI18n();

const GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'attendance', label: 'Attendance' },
    ],
  },
  { id: 'work', label: 'Work', items: [{ id: 'leave', label: 'Leave & requests' }] },
];

function setup(onSelect = vi.fn(), onOpenChange = vi.fn()) {
  return render(
    <CommandPalette
      open
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      groups={GROUPS}
      title="Search"
      placeholder="Search sections…"
      emptyLabel="No matches"
      hintLabel="Type to filter, Enter to open"
    />,
  );
}

describe('CommandPalette', () => {
  it('lists all items across groups', () => {
    setup();
    expect(screen.getByRole('option', { name: /Dashboard/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Leave & requests/ })).toBeTruthy();
  });

  it('filters as you type and shows the empty state', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('combobox'), 'leav');
    expect(screen.getByRole('option', { name: /Leave & requests/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Dashboard/ })).toBeNull();
    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No matches')).toBeTruthy();
  });

  it('moves with arrow keys and selects with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    setup(onSelect, onOpenChange);

    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'attendance' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('marks the first item active initially (aria-activedescendant)', () => {
    setup();
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant', options[0].id);
  });
});
