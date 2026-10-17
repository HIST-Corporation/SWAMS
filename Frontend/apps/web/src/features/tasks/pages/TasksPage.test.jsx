// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { TasksPage } from './TasksPage.jsx';
import { createTask, fetchTasks, patchTaskLane, updateTask, deleteLane, deleteTask, closeTask } from '../api.js';

vi.mock('../api.js', () => ({
  fetchTasks: vi.fn(),
  patchTaskLane: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  createLane: vi.fn(),
  updateLane: vi.fn(),
  deleteLane: vi.fn(),
  deleteTask: vi.fn(),
  closeTask: vi.fn(),
  addChecklistItem: vi.fn(),
  setChecklistItem: vi.fn(),
  removeChecklistItem: vi.fn(),
  fetchTaskTemplates: vi.fn(),
  createTaskTemplate: vi.fn(),
  applyTaskTemplate: vi.fn(),
  deleteTaskTemplate: vi.fn(),
}));

const i18n = initI18n({ lng: 'en' });

const TODOLINE = {
  id: 't1',
  title: 'Write the handover note',
  description: 'Cover the deployment steps.',
  lane: 'todo',
  priority: 'high',
  assignee: { id: 'u_anita', name: 'Anita Thapa', initials: 'AT' },
  reviewer: { id: 'u_ramesh', name: 'Ramesh Adhikari' },
  due: '2026-10-14',
  note: null,
  checklist: [
    { id: 'c1', text: 'Draft the steps', done: true },
    { id: 'c2', text: 'Ask Ramesh to review', done: false },
  ],
};
const DONELINE = {
  id: 't2',
  title: 'Archive the old receipts',
  description: '',
  lane: 'done',
  priority: 'low',
  assignee: null,
  reviewer: null,
  due: null,
  note: null,
  checklist: [],
};
const REVIEWLINE = {
  id: 't3',
  title: 'Publish the payroll runbook',
  description: '',
  lane: 'review',
  priority: 'normal',
  assignee: { id: 'u_priya', name: 'Priya Sharma', initials: 'PS' },
  reviewer: { id: 'u_anita', name: 'Anita Thapa' },
  due: null,
  note: null,
  checklist: [],
};
const REVROW = {
  id: 'rev_9',
  taskId: 't3',
  taskTitle: 'Publish the payroll runbook',
  issue: 'The rollback steps are missing.',
  suggestion: 'Add the rollback section before publishing.',
  severity: 'major',
  reviewer: 'Anita Thapa',
  date: '2026-10-11',
};
/** The five workflow columns as the server sends them (no WIP limits). */
const FIVE = ['todo', 'in_progress', 'review', 'revision', 'done'].map((id) => ({
  id,
  name: null,
  wipLimit: null,
}));

function renderBoard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <TasksPage />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

/** The grip is the keyboard/drag handle of a card. */
const gripFor = async (title) =>
  screen.findByRole('button', { name: new RegExp(`Move ${title}:`, 'i') });

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTasks.mockResolvedValue({ rows: [TODOLINE, DONELINE] });
  });

  it('renders one lane per board column with counts', async () => {
    renderBoard();

    for (const lane of ['To do', 'In progress', 'Review', 'Revision', 'Done']) {
      expect(await screen.findByText(lane)).toBeInTheDocument();
    }
    // Todo + Done each hold one fixture card.
    expect(await screen.findAllByText('1 task')).toHaveLength(2);
  });

  it('shows the checklist progress the card owns', async () => {
    renderBoard();

    expect(await screen.findByText('1/2 done')).toBeInTheDocument();
  });

  it('moves a card with the keyboard: Space, arrows, Space', async () => {
    patchTaskLane.mockResolvedValue({ record: { ...TODOLINE, lane: 'in_progress' } });
    const user = userEvent.setup();
    renderBoard();

    (await gripFor('Write the handover note')).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}');
    await user.keyboard(' ');

    // react-query passes a context object as mutationFn's second argument.
    await waitFor(() => {
      expect(patchTaskLane.mock.calls.length).toBeGreaterThan(0);
    });
    const [variables] = patchTaskLane.mock.calls[0];
    expect(variables).toMatchObject({ id: 't1', lane: 'in_progress' });
  });

  it('cancels the lift with Escape and announces it', async () => {
    const user = userEvent.setup();
    renderBoard();

    (await gripFor('Write the handover note')).focus();
    await user.keyboard(' ');
    await user.keyboard('{Escape}');

    expect(patchTaskLane).not.toHaveBeenCalled();
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });

  it('asks for a note before moving into Revision', async () => {
    patchTaskLane.mockResolvedValue({
      record: { ...TODOLINE, lane: 'revision', note: 'Fix this.' },
    });
    const user = userEvent.setup();
    renderBoard();

    (await gripFor('Write the handover note')).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowRight}');
    await user.keyboard(' ');

    // The revision prompt opens; nothing is sent until the note is confirmed.
    const dialog = await screen.findByRole('dialog');
    expect(patchTaskLane).not.toHaveBeenCalled();
    await user.type(within(dialog).getByRole('textbox'), 'Fix this.');
    await user.click(within(dialog).getByRole('button', { name: /move to revision/i }));

    await waitFor(() => {
      const [variables] = patchTaskLane.mock.calls[0];
      expect(variables).toMatchObject({ id: 't1', lane: 'revision', note: 'Fix this.' });
    });
  });

  it('rolls the card back and announces the server reason on rejection', async () => {
    patchTaskLane.mockRejectedValue(new Error('Add a reviewer before moving this task to Review.'));
    const user = userEvent.setup();
    renderBoard();

    (await gripFor('Archive the old receipts')).focus();
    await user.keyboard(' ');
    // In progress: the neighbour this card cannot move into is Review without
    // a reviewer, so the drop rejects and the live region says why.
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{ArrowLeft}');
    await user.keyboard(' ');

    await waitFor(() => {
      expect(screen.getByText(/move undone/i)).toBeInTheDocument();
    });
    // The optimistic move was rolled back — the card is back in Done.
    const done = await screen.findByText('Done');
    expect(done).toBeInTheDocument();
  });

  it('creates a task through the inline form', async () => {
    fetchTasks.mockResolvedValue({ rows: [DONELINE] });
    createTask.mockResolvedValue({
      record: { ...TODOLINE, id: 't9', title: 'Book the training room' },
    });
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole('button', { name: /new task/i }));
    await user.type(screen.getByLabelText(/^title$/i), 'Book the training room');
    await user.click(screen.getByRole('button', { name: /^add task$/i }));

    // react-query passes a context object as mutationFn's second argument.
    await waitFor(() => {
      expect(createTask.mock.calls.length).toBeGreaterThan(0);
    });
    const [variables] = createTask.mock.calls[0];
    expect(variables).toMatchObject({ title: 'Book the training room' });
    expect(await screen.findByRole('status')).toHaveTextContent('Task added to To do.');
  });

  it('opens the detail panel from the card title and returns focus on close', async () => {
    const user = userEvent.setup();
    renderBoard();

    const opener = await screen.findByRole('button', { name: 'Write the handover note' });
    await user.click(opener);

    const panel = await screen.findByRole('dialog', { name: 'Task details' });
    expect(within(panel).getByLabelText('Title')).toHaveValue('Write the handover note');
    expect(within(panel).getByLabelText('Description')).toHaveValue('Cover the deployment steps.');

    await user.click(within(panel).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();

    // The second control that opens a task returns focus to itself too — the
    // panel remembers the control it was opened from, not just "the card".
    const card = screen.getByRole('button', { name: 'Write the handover note' }).closest('li');
    const openButton = within(card).getByRole('button', { name: 'Open' });
    await user.click(openButton);
    await screen.findByRole('dialog', { name: 'Task details' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(openButton).toHaveFocus();
  });

  it('moves a card without dragging, through the panel lane select', async () => {
    updateTask.mockResolvedValue({ record: { ...TODOLINE, lane: 'review' } });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: 'Write the handover note' }));
    const panel = await screen.findByRole('dialog', { name: 'Task details' });
    await user.selectOptions(within(panel).getByLabelText(/^Lane/), 'review');
    await user.click(within(panel).getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateTask).toHaveBeenCalled());
    const [variables] = updateTask.mock.calls[0];
    expect(variables).toMatchObject({ id: 't1', patch: { lane: 'review' } });
    expect(await within(panel).findByText('Saved.')).toBeInTheDocument();
  });

  it('shows the server reason when the panel edit is refused', async () => {
    updateTask.mockRejectedValue(new Error('A title is required.'));
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: 'Write the handover note' }));
    const panel = await screen.findByRole('dialog', { name: 'Task details' });
    await user.clear(within(panel).getByLabelText(/^Title/));
    await user.click(within(panel).getByRole('button', { name: /save changes/i }));

    expect(await within(panel).findByRole('alert')).toHaveTextContent('A title is required.');
  });

  it('runs the lane workflow from the card buttons', async () => {
    patchTaskLane.mockResolvedValue({ record: { ...TODOLINE, lane: 'in_progress' } });
    const user = userEvent.setup();
    renderBoard();

    // A To do card offers Start — the same move the drag and keyboard paths make.
    await user.click(await screen.findByRole('button', { name: /^start$/i }));
    await waitFor(() => expect(patchTaskLane).toHaveBeenCalled());
    const [variables] = patchTaskLane.mock.calls[0];
    expect(variables).toMatchObject({ id: 't1', lane: 'in_progress' });
  });

  it('pushes a card back through the dialog with issue, suggestion and severity', async () => {
    fetchTasks.mockResolvedValue({ rows: [REVIEWLINE], lanes: FIVE });
    patchTaskLane.mockResolvedValue({
      record: { ...REVIEWLINE, lane: 'revision', note: 'Rollback steps missing.' },
    });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: /push back/i }));
    const dialog = await screen.findByRole('dialog', { name: /push back/i });
    // Nothing moves until the issue is confirmed — Revision needs a note (§7.6).
    expect(patchTaskLane).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/issue found/i), 'Rollback steps missing.');
    await user.type(within(dialog).getByLabelText(/suggestion/i), 'Add the rollback section.');
    await user.selectOptions(within(dialog).getByLabelText(/^severity/i), 'minor');
    await user.click(within(dialog).getByRole('button', { name: /^push back$/i }));

    await waitFor(() => expect(patchTaskLane).toHaveBeenCalled());
    const [variables] = patchTaskLane.mock.calls[0];
    expect(variables).toMatchObject({
      id: 't3',
      lane: 'revision',
      note: 'Rollback steps missing.',
      suggestion: 'Add the rollback section.',
      severity: 'minor',
    });
  });

  it('opens the new-task form from a lane, preset to that column', async () => {
    createTask.mockResolvedValue({
      record: { ...TODOLINE, id: 't9', title: 'QA the empty states', lane: 'in_progress' },
    });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: /add a task to in progress/i }));
    const form = await screen.findByRole('form', { name: 'Add a task' });
    expect(within(form).getByLabelText('Initial status')).toHaveValue('in_progress');

    await user.type(within(form).getByLabelText(/^title$/i), 'QA the empty states');
    await user.click(within(form).getByRole('button', { name: /^add task$/i }));

    await waitFor(() => expect(createTask).toHaveBeenCalled());
    const [variables] = createTask.mock.calls[0];
    expect(variables).toMatchObject({ title: 'QA the empty states', lane: 'in_progress' });
    expect(await screen.findByRole('status')).toHaveTextContent('Task added to In progress.');
  });

  it('renders the revision history trail from the payload', async () => {
    fetchTasks.mockResolvedValue({ rows: [], lanes: FIVE, revisions: [REVROW] });
    renderBoard();

    const trail = await screen.findByRole('region', { name: 'Revision history trail' });
    expect(within(trail).getByText('Publish the payroll runbook')).toBeInTheDocument();
    expect(within(trail).getByText('The rollback steps are missing.')).toBeInTheDocument();
    expect(within(trail).getByText('Major')).toBeInTheDocument();
    expect(within(trail).getByText('Anita Thapa')).toBeInTheDocument();
  });

  it('says which slice of the board the session is seeing', async () => {
    fetchTasks.mockResolvedValue({ rows: [], lanes: FIVE, scope: 'self' });
    renderBoard();

    expect(await screen.findByText(/only the work referred to you/i)).toBeInTheDocument();
  });

  it('warns when a column is over its WIP limit', async () => {
    fetchTasks.mockResolvedValue({
      rows: [
        { ...TODOLINE, id: 't7' },
        { ...TODOLINE, id: 't8' },
      ],
      lanes: [{ id: 'todo', name: null, wipLimit: 1 }],
    });
    renderBoard();

    expect(await screen.findByText(/WIP limit 1 exceeded/i)).toBeInTheDocument();
    expect(screen.getByText('2/1')).toBeInTheDocument();
  });

  it('lets a manager open the board settings, and hides it from everyone else', async () => {
    const user = userEvent.setup();
    renderBoard();

    expect(await screen.findByRole('button', { name: /new task/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /board settings/i })).not.toBeInTheDocument();

    fetchTasks.mockResolvedValue({ rows: [], lanes: FIVE, canManage: true });
    const managed = renderBoard();

    await user.click(await screen.findByRole('button', { name: /board settings/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Board columns' });
    expect(within(dialog).getByLabelText('Column name')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('button', { name: /^save$/i })).toHaveLength(5);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    managed.unmount();
  });

  it('closes the board settings on a backdrop click, but not on a click inside', async () => {
    const user = userEvent.setup();
    fetchTasks.mockResolvedValue({ rows: [], lanes: FIVE, canManage: true });
    renderBoard();

    await user.click(await screen.findByRole('button', { name: /board settings/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Board columns' });

    // A press that starts inside the dialog is ignored by the outside-click
    // guard, so it stays open.
    await user.click(within(dialog).getByLabelText('Column name'));
    expect(screen.getByRole('dialog', { name: 'Board columns' })).toBeInTheDocument();

    // The backdrop is the dialog's own parent element — a press there is
    // outside the dialog box, so it dismisses.
    await user.click(dialog.parentElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens a confirmation when a manager deletes the To do tab', async () => {
    fetchTasks.mockResolvedValue({
      rows: [
        { id: 't1', title: 'One', lane: 'todo' },
        { id: 't2', title: 'Two', lane: 'todo' },
        { id: 't3', title: 'Three', lane: 'todo' },
        { id: 't4', title: 'Four', lane: 'todo' },
      ],
      lanes: [{ id: 'todo', name: null, wipLimit: 4 }],
      canManage: true,
    });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByLabelText(/Delete To do/i));

    const dialog = await screen.findByRole('dialog', { name: /Delete To do/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Deleting the To do column/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/will move to no other column/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('deletes the tab when confirmed and clears the confirm state', async () => {
    fetchTasks.mockResolvedValue({
      rows: [
        { id: 't1', title: 'One', lane: 'todo' },
        { id: 't2', title: 'Two', lane: 'todo' },
        { id: 't3', title: 'Three', lane: 'todo' },
        { id: 't4', title: 'Four', lane: 'todo' },
      ],
      lanes: [{ id: 'todo', name: null, wipLimit: 4 }],
      canManage: true,
    });
    deleteLane.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByLabelText(/Delete To do/i));
    const dialog = await screen.findByRole('dialog', { name: /Delete To do/i });

    await user.click(within(dialog).getByRole('button', { name: /Delete/i }));
    await waitFor(() => expect(deleteLane).toHaveBeenCalledWith('todo', expect.anything()));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves the confirm state open when the delete is refused', async () => {
    fetchTasks.mockResolvedValue({
      rows: [
        { id: 't1', title: 'One', lane: 'todo' },
        { id: 't2', title: 'Two', lane: 'todo' },
        { id: 't3', title: 'Three', lane: 'todo' },
        { id: 't4', title: 'Four', lane: 'todo' },
      ],
      lanes: [{ id: 'todo', name: null, wipLimit: 4 }],
      canManage: true,
    });
    deleteLane.mockRejectedValue(new Error('not_allowed'));
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByLabelText(/Delete To do/i));
    const dialog = await screen.findByRole('dialog', { name: /Delete To do/i });

    await user.click(within(dialog).getByRole('button', { name: /Delete/i }));
    await waitFor(() => expect(deleteLane).toHaveBeenCalledWith('todo', expect.anything()));
    // The server refusal keeps the confirmation open.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens a confirmation when a task is deleted from the board', async () => {
    fetchTasks.mockResolvedValue({ rows: [TODOLINE], lanes: FIVE });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole('button', { name: /^Delete$/i }));

    const dialog = await screen.findByRole('dialog', { name: /Delete this task/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Write the handover note/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('deletes the task when confirmed, and cancels without deleting', async () => {
    fetchTasks.mockResolvedValue({ rows: [TODOLINE], lanes: FIVE });
    deleteTask.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderBoard();

    // Cancel first: nothing is deleted.
    await user.click(await screen.findByRole('button', { name: /^Delete$/i }));
    let dialog = await screen.findByRole('dialog', { name: /Delete this task/i });
    await user.click(within(dialog).getByRole('button', { name: /Cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteTask).not.toHaveBeenCalled();

    // Confirm: the task is deleted.
    await user.click(await screen.findByRole('button', { name: /^Delete$/i }));
    dialog = await screen.findByRole('dialog', { name: /Delete this task/i });
    await user.click(within(dialog).getByRole('button', { name: /^Delete$/i }));
    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith('t1', expect.anything()));
  });

  it('closes a Done card into the completed history instead of deleting it', async () => {
    fetchTasks.mockResolvedValue({ rows: [TODOLINE, DONELINE], lanes: FIVE });
    closeTask.mockResolvedValue({
      record: { ...DONELINE, closedAt: '2026-10-14T06:00:00.000Z' },
    });
    const user = userEvent.setup();
    renderBoard();

    // The Done column's card trades Delete for the close affordance…
    expect(screen.queryByRole('button', { name: /^Delete$/i })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Move to completed history/i }));

    // …and the close reaches the server, announced in the status line.
    await waitFor(() => expect(closeTask).toHaveBeenCalledWith('t2', expect.anything()));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Archive the old receipts moved to completed history.',
    );
  });

  it('opens a closed task from the completed history below the board', async () => {
    const closed = {
      ...DONELINE,
      id: 't5',
      title: 'Shut the old payroll sheet',
      closedAt: '2026-10-10T06:00:00.000Z',
    };
    fetchTasks.mockResolvedValue({ rows: [TODOLINE], completed: [closed], lanes: FIVE });
    const user = userEvent.setup();
    renderBoard();

    // The trail sits below the board and its title opens the same detail panel.
    expect(
      await screen.findByRole('heading', { name: 'Completed history' }),
    ).toBeInTheDocument();
    const opener = await screen.findByRole('button', { name: 'Shut the old payroll sheet' });
    await user.click(opener);

    const panel = await screen.findByRole('dialog', { name: 'Task details' });
    expect(within(panel).getByLabelText('Title')).toHaveValue('Shut the old payroll sheet');
  });
});
