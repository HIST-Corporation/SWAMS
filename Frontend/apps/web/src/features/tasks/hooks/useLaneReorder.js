import { useState } from 'react';
import { LANE_DRAG_TYPE } from '../utils/lanes.js';

/**
 * The column-reorder machine (§7.6) — a manager/HR reshapes the board by
 * dragging a column's grip onto another column, or (keyboard) pressing ←/→ on
 * the grip. The move is server-backed through `onMove(id, index)`; this hook
 * only decides the gesture, the same separation the card drag uses.
 *
 * A reorder drag is tagged with `LANE_DRAG_TYPE` on the dataTransfer so the
 * board's card-drop handler can tell a column reorder from a card move and
 * never move a card by mistake. Dragging is never the only route: the grip
 * answers the arrow keys too (WCAG 2.5.7).
 *
 * @param {{ lanes: object[], canManage: boolean, onMove: (id: string, index: number) => void, onDelete: (lane: object) => void }} props
 */
export function useLaneReorder({ lanes, canManage, onMove, onDelete }) {
  const [dragId, setDragId] = useState(null); // the column being dragged
  const [aimId, setAimId] = useState(null); // the column under the pointer

  const begin = (lane, event) => {
    if (!canManage) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(LANE_DRAG_TYPE, lane.id);
    setDragId(lane.id);
    setAimId(null);
  };

  const finish = () => {
    setDragId(null);
    setAimId(null);
  };

  /** Move the dragged column into `toId`'s position (its index in `lanes`). */
  const commit = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    const index = lanes.findIndex((lane) => lane.id === toId);
    if (index === -1) return;
    onMove(fromId, index);
  };

  /** The pointer released over column `toId` — read the dragged id back off the drag. */
  const drop = (event, toId) => {
    const fromId = event.dataTransfer?.getData?.(LANE_DRAG_TYPE) ?? dragId;
    commit(fromId, toId);
    finish();
  };

  /** Keyboard gesture: ←/→ slide this column one place, mirroring the drag. */
  const step = (lane, event) => {
    if (!canManage) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = lanes.findIndex((item) => item.id === lane.id);
    const next = event.key === 'ArrowRight' ? current + 1 : current - 1;
    if (current === -1 || next < 0 || next >= lanes.length) return;
    onMove(lane.id, next);
  };

  /**
   * The per-column bundle `BoardLane` consumes. Rebuilt per lane so the grip,
   * drop and keyboard handlers close over the right column.
   */
  const reorderFor = (lane) => ({
    canManage,
    dragging: dragId === lane.id,
    over: dragId != null && dragId !== lane.id && aimId === lane.id,
    start: (event) => begin(lane, event),
    end: finish,
    aim: setAimId,
    drop: (event) => drop(event, lane.id),
    key: (event) => step(lane, event),
    onDelete,
  });

  return { dragId, aimId, reorderFor };
}
