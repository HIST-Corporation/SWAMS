// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { DeleteTaskConfirm } from './DeleteTaskConfirm.jsx';

const i18n = initI18n({ lng: 'en' });

const renderConfirm = (props = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <DeleteTaskConfirm
        open
        title="Write the handover note"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        {...props}
      />
    </I18nextProvider>,
  );

describe('DeleteTaskConfirm', () => {
  it('renders when open and asks for confirmation', () => {
    renderConfirm();

    expect(screen.getByRole('dialog', { name: /Delete this task/i })).toBeInTheDocument();
    expect(screen.getByText(/Write the handover note/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('calls onConfirm when the Delete button is clicked', () => {
    const onConfirm = vi.fn();
    renderConfirm({ onConfirm });

    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel and leaves closing to the parent', () => {
    const onCancel = vi.fn();
    const { rerender } = renderConfirm({ onCancel });

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();

    // The dialog stays mounted until the parent re-renders with `open=false`.
    rerender(
      <I18nextProvider i18n={i18n}>
        <DeleteTaskConfirm
          open={false}
          title="Write the handover note"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { queryByRole } = renderConfirm({ open: false });
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });
});
