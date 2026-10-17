import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { labelOf, toLane } from '../utils/lanes.js';
import { useMoveTask } from './useTasks.js';

/**
 * The board's move machine (§7.6), pulled out of the page so the page renders
 * and this decides: pointer drags, the keyboard lift/aim/drop sequence, the
 * card buttons, and the announcements all funnel through one place.
 *
 * Pointer users pick a card up from its grip and drop it on a lane; keyboard
 * users lift with Space, aim with ←/→, drop with Space, cancel with Escape —
 * the same `requestMove` either way. A move into Revision never happens on its
 * own: it opens the note prompt (`pendingNote`) because the rule needs a note,
 * and the push-back dialog calls `commit` directly with the richer detail.
 *
 * Every state change is announced in the live region, and a move the server
 * refuses rolls back with its reason spoken rather than swallowed.
 *
 * @param {{ lanes: object[], rows: object[] }} props
 */
export function useBoardDrag({ lanes, rows }) {
  const { t } = useTranslation('tasks');
  const [lifted, setLifted] = useState(null); // { id, lane }
  const [aim, setAim] = useState(null); // lane id while lifted
  const [dragLane, setDragLane] = useState(null); // lane under the pointer
  const [announcement, setAnnouncement] = useState('');
  const [pendingNote, setPendingNote] = useState(null); // { id, lane }

  const laneKeys = lanes.map((lane) => lane.id);
  const label = (id) => labelOf(t, toLane(id, lanes));
  const find = (id) => rows.find((row) => row.id === id);
  const titleOf = (id) => find(id)?.title ?? id;

  const move = useMoveTask({
    onSuccess: (_record, variables) =>
      setAnnouncement(
        t('board.dropped', { title: titleOf(variables.id), lane: label(variables.lane) }),
      ),
    onError: (error) => setAnnouncement(t('board.rolledBack', { reason: error.message })),
  });

  /** A lane preview the mock refuses is drawn as refused (§7.6 valid|invalid). */
  const dropValidFor = (taskId, laneId) => {
    const task = find(taskId);
    if (!task || task.lane === laneId) return false;
    if (laneId === 'review' && !task.reviewer) return false;
    return true;
  };

  const putDown = () => {
    setLifted(null);
    setAim(null);
    setDragLane(null);
  };

  /** Hand a decided move to the server, clearing every pick-up state first. */
  const commit = (taskId, laneId, note, extra) => {
    putDown();
    move.mutate({ id: taskId, lane: laneId, note, ...extra });
  };

  /** Revision always stops at the note prompt; everything else moves at once. */
  const requestMove = (taskId, laneId) => {
    setDragLane(null);
    const task = find(taskId);
    if (!task || task.lane === laneId) {
      setLifted(null);
      setAim(null);
      return;
    }
    if (laneId === 'revision') {
      setPendingNote({ id: taskId, lane: laneId });
      return;
    }
    commit(taskId, laneId);
  };

  const lift = (task) => {
    setLifted({ id: task.id, lane: task.lane });
    setAim(task.lane);
    setAnnouncement(t('board.lifted', { title: task.title }));
  };

  const cancelLift = () => {
    if (!lifted) return;
    setAnnouncement(t('board.cancelled', { title: titleOf(lifted.id), lane: label(lifted.lane) }));
    setLifted(null);
    setAim(null);
    setPendingNote(null);
  };

  /**
   * Grip keyboard machine (§7.6): Space lifts or drops, ←/→ aim at the
   * neighbouring lane while lifted, Escape cancels.
   */
  const handleGripKeyDown = (event, task) => {
    if (event.key === 'Escape') {
      setPendingNote(null);
      cancelLift();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      if (!lifted) return;
      event.preventDefault();
      const order = laneKeys.indexOf(aim ?? lifted.lane);
      const next = event.key === 'ArrowRight' ? order + 1 : order - 1;
      if (next < 0 || next >= laneKeys.length) return;
      const reached = laneKeys[next];
      setAim(reached);
      setAnnouncement(t('board.moved', { title: titleOf(lifted.id), lane: label(reached) }));
      return;
    }
    if (event.key !== ' ' || event.repeat) return;
    event.preventDefault();

    if (!lifted) {
      lift(task);
      return;
    }
    // A second card's grip while one is lifted: move the lifted one here.
    requestMove(lifted.id, lifted.id === task.id ? (aim ?? task.lane) : task.lane);
  };

  /** Pointer drop: the drag always passed through `lift`, so `lifted` owns the id. */
  const requestMoveByDrop = (laneId) => {
    if (lifted) {
      requestMove(lifted.id, laneId);
      return;
    }
    setDragLane(null);
  };

  return {
    lifted,
    lift,
    cancelLift,
    dragLane,
    setDragLane,
    announcement,
    setAnnouncement,
    pendingNote,
    setPendingNote,
    dropValidFor,
    handleGripKeyDown,
    requestMove,
    requestMoveByDrop,
    commit,
  };
}
