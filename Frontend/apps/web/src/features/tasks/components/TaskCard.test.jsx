// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { TaskCard } from './TaskCard.jsx';

const i18n = initI18n({ lng: 'en' });

const TASK = {
  id: 't1',
  title: 'Write the handover note',
  lane: 'in_progress',
  priority: 'normal',
  assignee: { name: 'Sarah Mitchell' },
  due: null,
  checklist: [],
};

const renderCard = ({ onDelete, ...rest } = {}) => {
  const handlers = {
    onOpen: vi.fn(),
    onGripKeyDown: vi.fn(),
    onLift: vi.fn(),
    onDragEnd: vi.fn(),
    ...rest,
  };
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <TaskCard task={TASK} onDelete={onDelete} {...handlers} />
    </I18nextProvider>,
  );
  return { ...utils, ...handlers };
};

describe('TaskCard — per-card delete gating', () => {
  it('shows the delete icon when onDelete is provided (first/last column)', () => {
    renderCard({ onDelete: vi.fn() });
    expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
  });

  it('hides the delete icon when onDelete is absent (mid-flight column)', () => {
    renderCard({ onDelete: undefined });
    expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();
  });

  it('calls onDelete with the task when the delete icon is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard({ onDelete });

    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(onDelete).toHaveBeenCalledWith(TASK);
  });
});

describe('TaskCard — close into the completed history', () => {
  it('shows the close icon only when onClose is provided (exit column)', () => {
    const managed = renderCard({ onClose: vi.fn() });
    expect(
      screen.getByRole('button', { name: /Move to completed history/i }),
    ).toBeInTheDocument();
    managed.unmount();

    renderCard({ onClose: undefined });
    expect(
      screen.queryByRole('button', { name: /Move to completed history/i }),
    ).not.toBeInTheDocument();
  });

  it('calls onClose with the task when the close icon is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderCard({ onClose });

    await user.click(screen.getByRole('button', { name: /Move to completed history/i }));
    expect(onClose).toHaveBeenCalledWith(TASK);
  });
});

describe('TaskCard — Open affordance', () => {
  it('renders an Open button that opens the task', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderCard({ onOpen });

    const open = screen.getByRole('button', { name: /^Open$/i });
    await user.click(open);
    expect(onOpen).toHaveBeenCalledWith(TASK, expect.anything());
  });
});
