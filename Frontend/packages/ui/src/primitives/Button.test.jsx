// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button.jsx';

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Clock in</Button>);
    await user.click(screen.getByRole('button', { name: 'Clock in' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is busy and disabled while loading (Section 8.7)', () => {
    render(<Button loading>Sending request</Button>);
    const button = screen.getByRole('button', { name: 'Sending request' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Quiet</Button>);
    expect(screen.getByRole('button', { name: 'Quiet' })).toHaveAttribute('type', 'button');
  });

  it('is keyboard reachable', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Approve</Button>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });
});
