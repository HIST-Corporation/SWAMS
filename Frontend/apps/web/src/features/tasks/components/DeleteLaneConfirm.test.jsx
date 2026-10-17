// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { DeleteLaneConfirm } from './DeleteLaneConfirm.jsx';

const i18n = initI18n({ lng: 'en' });

describe('DeleteLaneConfirm', () => {
  it('renders when open and asks for confirmation', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DeleteLaneConfirm
          open
          laneName="To do"
          laneCount={4}
          firstRemainingName="In progress"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole('dialog', { name: /Delete To do/i })).toBeInTheDocument();
    expect(screen.getByText(/Deleting the To do column/i)).toBeInTheDocument();
    expect(screen.getByText(/will move to In progress/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('calls onCancel and leaves closing to the parent', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <DeleteLaneConfirm
          open
          laneName="To do"
          laneCount={4}
          firstRemainingName="In progress"
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();
    // The dialog stays mounted until the parent re-renders with `open=false`.
    rerender(
      <I18nextProvider i18n={i18n}>
        <DeleteLaneConfirm
          open={false}
          laneName="To do"
          laneCount={4}
          firstRemainingName="In progress"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when the Delete button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <DeleteLaneConfirm
          open
          laneName="To do"
          laneCount={4}
          firstRemainingName="In progress"
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    const { queryByRole } = render(
      <I18nextProvider i18n={i18n}>
        <DeleteLaneConfirm open={false} laneName="To do" laneCount={4} firstRemainingName="In progress" onConfirm={vi.fn()} onCancel={vi.fn()} />
      </I18nextProvider>,
    );

    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });
});
