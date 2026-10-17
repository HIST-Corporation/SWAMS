import { useRef, useState } from 'react';
import { Plus, SlidersHorizontal, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';
import { LANES } from '../mocks/seeds.js';
import { labelOf, toLane } from '../utils/lanes.js';
import { useTaskBoard, useUpdateLane, useDeleteLane, useDeleteTask, useCloseTask } from '../hooks/useTasks.js';
import { useBoardDrag } from '../hooks/useBoardDrag.js';
import { BoardColumns } from '../components/BoardColumns.jsx';
import { CompletedTrail } from '../components/CompletedTrail.jsx';
import { DeleteLaneConfirm } from '../components/DeleteLaneConfirm.jsx';
import { DeleteTaskConfirm } from '../components/DeleteTaskConfirm.jsx';
import { LaneSettingsDialog } from '../components/LaneSettingsDialog.jsx';
import { TemplatesDrawer } from '../components/TemplatesDrawer.jsx';
import { NewTaskForm } from '../components/NewTaskForm.jsx';
import { NotePrompt } from '../components/NotePrompt.jsx';
import { PushBackDialog } from '../components/PushBackDialog.jsx';
import { RevisionTrail } from '../components/RevisionTrail.jsx';
import { TaskDetailDialog } from '../components/TaskDetailDialog.jsx';

const FALLBACK_LANES = LANES.map((id) => ({ id, name: null, wipLimit: null }));

/**
 * `/work/tasks` — the kanban board (§7.6), the page half. Pointer users drag
 * cards between lanes; keyboard users lift with Space on a card's grip, aim
 * with ←/→, drop with Space and cancel with Escape; everyone else uses the
 * card's own buttons (Start, Send to review, Approve, Push back). All of that
 * is the `useBoardDrag` machine — this page renders it and owns the panels.
 *
 * The page shows the SERVER's view of the board: which columns exist (the five
 * workflow lanes plus anything a manager added), who may reshape them
 * (`canManage`), and which slice of the work this session may see — a staff
 * session receives only tasks referred to it, echoed here as a plain note, so
 * the UI never assumes a scope from a role label (§4.1).
 *
 * Opening a card (title button or "Open") mounts the detail panel: fields, the
 * to-do list, and the lane as a plain `select` — the mouse-and-keyboard way to
 * move work that WCAG 2.5.7 asks for, so dragging is never the only route.
 */
export function TasksPage() {
  const { t } = useTranslation('tasks');
  const [formLane, setFormLane] = useState(null); // lane id while the new-task form is open
  const [createdLane, setCreatedLane] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [pendingPush, setPendingPush] = useState(null); // the Push back dialog
  const openerRef = useRef(null);
  const [deletingId, setDeletingId] = useState(null); // tab (column) being deleted
  const [deletingTaskId, setDeletingTaskId] = useState(null); // task being deleted
  const [closeNote, setCloseNote] = useState(null); // { tone, text } after a close

  const board = useTaskBoard();
  const deleteLane = useDeleteLane({
    onSuccess: () => setDeletingId(null),
  });
  const deleteTask = useDeleteTask({
    onSuccess: () => setDeletingTaskId(null),
  });
  // Closing is the Done column's exit: the card retires into the completed
  // history below the board (still openable there), never deleted outright.
  const closeTask = useCloseTask({
    onSuccess: (response) =>
      setCloseNote({ tone: 'success', text: t('completed.moved', { title: response.record.title }) }),
    onError: (error) =>
      setCloseNote({
        tone: 'error',
        text: t('completed.failed', { reason: error?.message ?? '' }),
      }),
  });
  const updateLane = useUpdateLane();
  const lanes = board.lanes.length > 0 ? board.lanes : FALLBACK_LANES;
  const label = (id) => labelOf(t, toLane(id, lanes));
  const drag = useBoardDrag({ lanes, rows: board.rows });

  // Tab (column) deletion surface.
  const deletingLane = deletingId ? lanes.find((lane) => lane.id === deletingId) : null;
  const deletingLaneName = deletingLane ? label(deletingLane.id) : '';
  const deletingLaneCount = deletingId
    ? board.rows.filter((row) => row.lane === deletingId).length
    : 0;
  const firstRemainingLane =
    deletingLane && lanes ? lanes.find((lane) => lane.id !== deletingLane.id) : null;
  const firstRemainingName = firstRemainingLane ? label(firstRemainingLane.id) : t('deleteLane.none');

  // The board rows plus the completed history — a closed task opens from the
  // trail exactly like one on the board.
  const find = (id) => board.rows.find((row) => row.id === id) ?? board.completed.find((row) => row.id === id);
  const openTask = find(openId);
  const deletingTask = find(deletingTaskId);

  /** Remember the control that opened the panel so focus can return to it. */
  const showTask = (task, event) => {
    openerRef.current = event?.currentTarget ?? document.activeElement;
    setOpenId(task.id);
  };
  const hideTask = () => {
    setOpenId(null);
    const opener = openerRef.current;
    if (opener?.isConnected) opener.focus();
    openerRef.current = null;
  };

  /** The card's Push back button: the richer dialog instead of the note prompt. */
  const requestPushBack = (task) => setPendingPush(task.id);

  return (
    <div className="mx-auto grid w-full max-w-page gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl">{t('title')}</h1>
          <p className="text-text-muted text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {board.canManage ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <SlidersHorizontal aria-hidden="true" size={15} strokeWidth={2} />
              {t('settings.open')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setTemplatesOpen(true)}
          >
            <LayoutGrid aria-hidden="true" size={15} strokeWidth={2} />
            {t('templates.open')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setFormLane((current) => (current === null ? 'todo' : null))}
          >
            <Plus aria-hidden="true" size={15} strokeWidth={2} />
            {t('newTask.open')}
          </Button>
        </div>
      </header>

      {board.scope === 'self' ? <p className="text-text-muted text-sm">{t('scope.self')}</p> : null}

      <TemplatesDrawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} board={board} />

      {deletingId ? (
        <DeleteLaneConfirm
          open
          laneName={deletingLaneName}
          laneCount={deletingLaneCount}
          firstRemainingName={firstRemainingName}
          onConfirm={() => deleteLane.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      ) : null}

      <p id="board-keyboard-help" className="sr-only">
        {t('board.keyboardHelp')}
      </p>
      <div className="sr-only" aria-live="polite">
        {drag.announcement}
      </div>

      {formLane !== null ? (
        <NewTaskForm
          initialLane={formLane}
          lanes={lanes}
          onClose={() => setFormLane(null)}
          onCreated={(laneId) => {
            setFormLane(null);
            setCreatedLane(laneId);
          }}
        />
      ) : null}
      {createdLane !== null ? (
        <p role="status" className="text-success-text text-sm">
          {t('newTask.created', { lane: label(createdLane) })}
        </p>
      ) : null}
      {closeNote ? (
        <p
          role={closeNote.tone === 'error' ? 'alert' : 'status'}
          className={`text-sm ${closeNote.tone === 'error' ? 'text-danger-text' : 'text-success-text'}`}
        >
          {closeNote.text}
        </p>
      ) : null}

      {drag.pendingNote ? (
        <NotePrompt
          task={find(drag.pendingNote.id) ?? { title: drag.pendingNote.id }}
          onConfirm={(note) => {
            const { id, lane } = drag.pendingNote;
            drag.setPendingNote(null);
            drag.commit(id, lane, note);
          }}
          onCancel={() => {
            drag.setPendingNote(null);
            drag.cancelLift();
          }}
        />
      ) : null}

      {pendingPush !== null && find(pendingPush) ? (
        <PushBackDialog
          task={find(pendingPush)}
          onConfirm={(detail) => {
            setPendingPush(null);
            drag.commit(pendingPush, 'revision', detail.note, {
              suggestion: detail.suggestion,
              severity: detail.severity,
            });
          }}
          onCancel={() => setPendingPush(null)}
        />
      ) : null}

      <BoardColumns
        board={board}
        lanes={lanes}
        liftedTaskId={drag.lifted?.id ?? null}
        dragOverLane={drag.dragLane}
        dropValidFor={drag.dropValidFor}
        onOpenTask={showTask}
        onGripKeyDown={drag.handleGripKeyDown}
        onLift={drag.lift}
        onDrop={drag.requestMoveByDrop}
        onDragOver={drag.setDragLane}
        onQuickAdd={(lane) => setFormLane(lane.id)}
        onAdvance={(task, laneId) => drag.requestMove(task.id, laneId)}
        onPushBack={requestPushBack}
        onDelete={(task) => setDeletingTaskId(task.id)}
        onClose={(task) => closeTask.mutate(task.id)}
        onReorderLane={(id, index) => updateLane.mutate({ id, patch: { index } })}
        onDeleteLane={(lane) => setDeletingId(lane.id)}
      />

      {deletingTask ? (
        <DeleteTaskConfirm
          open
          title={deletingTask.title}
          onConfirm={() => deleteTask.mutate(deletingTaskId)}
          onCancel={() => setDeletingTaskId(null)}
        />
      ) : null}

      <RevisionTrail revisions={board.revisions} visible={!board.isLoading && !board.error} />

      <CompletedTrail
        tasks={board.completed}
        visible={!board.isLoading && !board.error}
        onOpen={showTask}
      />

      {openTask ? <TaskDetailDialog task={openTask} lanes={lanes} onClose={hideTask} /> : null}
      {settingsOpen ? (
        <LaneSettingsDialog lanes={lanes} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
}
