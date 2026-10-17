// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox, Input, Switch } from '../index.js';
import { initI18n } from '@swams/i18n';

initI18n();

describe('Input', () => {
  it('exposes aria-invalid for error styling and screen readers', () => {
    render(<Input aria-label="Email" invalid />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Checkbox', () => {
  it('toggles checked state on click and keyboard', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Notify my manager" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Notify my manager' });
    await user.click(box);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(' ');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it('renders the indeterminate state', () => {
    render(<Checkbox aria-label="Select all" checked="indeterminate" />);
    expect(screen.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
      'data-state',
      'indeterminate',
    );
  });
});

describe('Switch', () => {
  it('toggles on click and reports state', async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Email me approvals" />);
    const sw = screen.getByRole('switch', { name: 'Email me approvals' });
    expect(sw).toHaveAttribute('data-state', 'unchecked');
    await user.click(sw);
    expect(sw).toHaveAttribute('data-state', 'checked');
  });
});
