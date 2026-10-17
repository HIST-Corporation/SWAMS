// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../index.js';
import { initI18n } from '@swams/i18n';

initI18n();

function Trigger({ onUndo }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          title: 'Request sent',
          description: 'Ramesh will review your leave request.',
          action: onUndo ? { label: 'Undo', onAction: onUndo } : undefined,
        })
      }
    >
      Send
    </button>
  );
}

function setup(onUndo) {
  return render(
    <ToastProvider>
      <Trigger onUndo={onUndo} />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  it('renders title and description in the live-region viewport', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Send' }));
    const viewport = await screen.findByRole('region'); // Radix toast viewport
    expect(viewport).toHaveTextContent('Request sent');
    expect(viewport).toHaveTextContent('Ramesh will review your leave request.');
  });

  it('runs the undo action once and closes the toast', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    setup(onUndo);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    const undo = await screen.findByRole('button', { name: 'Undo' });
    await user.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull());
  });

  it('can be dismissed with the close button (viewport persists, toast unmounts)', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Request sent');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText('Request sent')).toBeNull());
  });
});
