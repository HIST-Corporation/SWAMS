import { ErrorState, Skeleton } from '@swams/ui';
import { BoardLane } from './BoardLane.jsx';
import { useLaneReorder } from '../hooks/useLaneReorder.js';

/**
 * Columns keep one readable width and never squeeze to fit: when five-plus
 * lanes don't share the screen the strip scrolls sideways instead of packing
 * the tabs tight — the kanban never breaks into rows (Trello's responsive
 * rule, §7.6). One flex row, so every lane sits side by side at any width.
 *
 * `items-start` lets each column be only as tall as its own cards: without it,
 * flex's default `align-items: stretch` forces a short column (In progress)
 * to stretch to the tallest (To do), leaving dead space and a stretched box
 * under its content (§7.6 — the lane background stops at its content).
 */
const LANE_STRIP = 'flex items-start gap-3 overflow-x-auto pb-1';
const LANE_ITEM = 'w-64 shrink-0 lg:w-72';

/**
 * The board's column area: skeleton while the payload loads, the designed
 * error state with the server's request id on failure, otherwise every
 * configured column with its cards. Extracted from the page so the page owns
 * state and wiring only.
 *
 * The entry column (To do) keeps the per-card delete — the clean "cancel" of
 * work that never started. The workflow's EXIT column (Done, or the last
 * column after a reshape) trades delete for CLOSE: the card leaves the board
 * into the completed history below, where it stays openable, instead of being
 * discarded (§7.6). The columns in between (In progress / Review / Revision)
 * carry only their forward actions, so mid-flight work is never removed by
 * accident. Which columns are entry/exit is read off the live `lanes` order,
 * so a reordered board moves the affordance with the columns.
 *
 * @param {{ board: object, lanes: object[], liftedTaskId?: string|null, dragOverLane?: string|null, dropValidFor: (taskId: string, lane: string) => boolean, onOpenTask: Function, onGripKeyDown: Function, onLift: Function, onDrop: Function, onDragOver: Function, onQuickAdd: Function, onAdvance?: Function, onPushBack?: Function, onDelete?: Function, onClose?: Function, onReorderLane?: (id: string, index: number) => void, onDeleteLane?: (lane: object) => void }} props
 */
export function BoardColumns({
  board,
  lanes,
  liftedTaskId,
  dragOverLane,
  dropValidFor,
  onOpenTask,
  onGripKeyDown,
  onLift,
  onDrop,
  onDragOver,
  onQuickAdd,
  onAdvance,
  onPushBack,
  onDelete,
  onClose,
  onReorderLane,
  onDeleteLane,
}) {
  const reorder = useLaneReorder({
    lanes,
    canManage: board.canManage === true,
    onMove: onReorderLane ?? (() => {}),
    onDelete: onDeleteLane ?? (() => {}),
  });

  // The entry column keeps delete; the exit column (Done, else the last one)
  // trades it for close — the card retires into the completed history.
  const firstLaneId = lanes[0]?.id;
  const lastLaneId = lanes[lanes.length - 1]?.id;
  const exitLaneId = lanes.some((lane) => lane.id === 'done') ? 'done' : lastLaneId;


  if (board.isLoading) {
    return (
      <div aria-busy="true" className={LANE_STRIP}>
        {lanes.map((lane) => (
          <Skeleton key={lane.id} className={`${LANE_ITEM} h-48 rounded-card`} />
        ))}
      </div>
    );
  }

  if (board.error) {
    return (
      <ErrorState
        message={board.error.message}
        requestId={board.error.requestId}
        onRetry={board.refetch}
      />
    );
  }

  return (
    <div className={LANE_STRIP}>
      {lanes.map((lane) => (
        <BoardLane
          key={lane.id}
          className={LANE_ITEM}
          lane={lane}
          tasks={board.rows.filter((row) => row.lane === lane.id)}
          liftedTaskId={liftedTaskId}
          dragOver={dragOverLane === lane.id}
          dropValid={liftedTaskId ? dropValidFor(liftedTaskId, lane.id) : true}
          reorder={reorder.reorderFor(lane)}
          canDeleteCard={lane.id === firstLaneId}
          canCloseCard={lane.id === exitLaneId}
          onOpenTask={onOpenTask}
          onGripKeyDown={onGripKeyDown}
          onLift={onLift}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onQuickAdd={onQuickAdd}
          onAdvance={onAdvance}
          onPushBack={onPushBack}
          onDelete={onDelete}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
