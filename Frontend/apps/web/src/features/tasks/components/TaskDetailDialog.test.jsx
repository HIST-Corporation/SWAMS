// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { TaskDetailDialog } from './TaskDetailDialog.jsx';
import { addChecklistItem, removeChecklistItem, setChecklistItem, updateTask } from '../api.js';

vi.mock('../api.js', () => ({
  fetchTasks: vi.fn(),
  patchTaskLane: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  addChecklistItem: vi.fn(),
  setChecklistItem: vi.fn(),
  removeChecklistItem: vi.fn(),
}));

const i18n = initI18n({ lng: 'en' });

const TASK = {
  id: 'tsk_01',
  title: 'Prepare the monthly payroll export',
  description: 'Finance needs the CSV before the 15th.',
  lane: 'todo',
  priority: 'high',
  assignee: { id: 'u_anita', name: 'Anita Thapa', initials: 'AT' },
  reviewer: null,
  due: '2026-10-14',
  note: null,
  checklist: [
    { id: 'c1', text: 'Pull the attendance summary', done: true },
    { id: 'c2', text: 'Send the file to Finance', done: false },
  ],
};

function renderPanel({ task = TASK, onClose = vi.fn() } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <TaskDetailDialog task={task} onClose={onClose} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
  return { onClose };
}

const panel = () => screen.getByRole('dialog', { name: 'Task details' });

describe('TaskDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens as a labelled modal with every field the contract accepts', () => {
    renderPanel();

    const dialog = panel();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByLabelText('Title')).toHaveValue(TASK.title);
    expect(within(dialog).getByLabelText('Priority')).toHaveValue('high');
    expect(within(dialog).getByLabelText(/^Lane/)).toHaveValue('todo');
    expect(within(dialog).getByLabelText('Due date')).toHaveValue('2026-10-14');
    expect(within(dialog).getByLabelText('Assignee')).toHaveValue('u_anita');
    expect(within(dialog).getByLabelText('Reviewer')).toHaveValue('');
    // The to-do list, with its derived count.
    expect(
      within(dialog).getByRole('checkbox', { name: 'Pull the attendance summary' }),
    ).toBeChecked();
    expect(within(dialog).getByText('1 of 2 done')).toBeInTheDocument();
  });

  it('keeps Save disabled until a field actually changes, then saves only that field', async () => {
    updateTask.mockResolvedValue({ record: { ...TASK, priority: 'low' } });
    const user = userEvent.setup();
    renderPanel();

    const save = within(panel()).getByRole('button', { name: /save changes/i });
    expect(save).toBeDisabled();

    await user.selectOptions(within(panel()).getByLabelText('Priority'), 'low');
    expect(save).toBeEnabled();
    await user.click(save);

    // react-query passes a context object as mutationFn's second argument.
    await waitFor(() =>
      expect(updateTask.mock.calls[0][0]).toEqual({ id: 'tsk_01', patch: { priority: 'low' } }),
    );
    expect(await within(panel()).findByRole('status')).toHaveTextContent('Saved.');
  });

  it('sends an emptied due date as null, never as an empty string', async () => {
    updateTask.mockResolvedValue({ record: { ...TASK, due: null } });
    const user = userEvent.setup();
    renderPanel();

    await user.clear(within(panel()).getByLabelText('Due date'));
    await user.click(within(panel()).getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(updateTask.mock.calls[0][0]).toEqual({ id: 'tsk_01', patch: { due: null } }),
    );
  });

  it('shows the server message when the patch is refused and keeps the draft', async () => {
    updateTask.mockRejectedValue(new Error('Add a reviewer before moving this task to Review.'));
    const user = userEvent.setup();
    renderPanel();

    await user.selectOptions(within(panel()).getByLabelText(/^Lane/), 'review');
    await user.click(within(panel()).getByRole('button', { name: /save changes/i }));

    expect(await within(panel()).findByRole('alert')).toHaveTextContent(
      'Add a reviewer before moving this task to Review.',
    );
    // The choice is still on screen — a refused edit is not silently dropped.
    expect(within(panel()).getByLabelText(/^Lane/)).toHaveValue('review');
  });

  it('asks before closing on unsaved changes, then closes on the second Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.type(within(panel()).getByLabelText('Title'), ' today');
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(within(panel()).getByRole('alert')).toHaveTextContent("aren't saved yet");

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('adds a checklist item and clears the field', async () => {
    addChecklistItem.mockResolvedValue({
      record: {
        ...TASK,
        checklist: [...TASK.checklist, { id: 'c3', text: 'Email Finance', done: false }],
      },
    });
    const user = userEvent.setup();
    renderPanel();

    const field = within(panel()).getByLabelText('Add a to-do item');
    await user.type(field, 'Email Finance{Enter}');

    await waitFor(() =>
      expect(addChecklistItem.mock.calls[0][0]).toEqual({ id: 'tsk_01', text: 'Email Finance' }),
    );
    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('ticks a checklist item with the item id, never the index', async () => {
    setChecklistItem.mockResolvedValue({ record: TASK });
    const user = userEvent.setup();
    renderPanel();

    await user.click(within(panel()).getByRole('checkbox', { name: 'Send the file to Finance' }));

    await waitFor(() =>
      expect(setChecklistItem.mock.calls[0][0]).toEqual({ id: 'tsk_01', itemId: 'c2', done: true }),
    );
  });

  it('removes a checklist item by its own label', async () => {
    removeChecklistItem.mockResolvedValue({
      record: { ...TASK, checklist: [TASK.checklist[0]] },
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      within(panel()).getByRole('button', { name: 'Remove Send the file to Finance' }),
    );

    await waitFor(() =>
      expect(removeChecklistItem.mock.calls[0][0]).toEqual({ id: 'tsk_01', itemId: 'c2' }),
    );
  });

  it('reports a refused checklist write instead of pretending it worked', async () => {
    setChecklistItem.mockRejectedValue(new Error('That checklist item no longer exists.'));
    const user = userEvent.setup();
    renderPanel();

    await user.click(within(panel()).getByRole('checkbox', { name: 'Send the file to Finance' }));

    expect(await within(panel()).findByRole('alert')).toHaveTextContent(
      'That checklist item no longer exists.',
    );
  });
});
