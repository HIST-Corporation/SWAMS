import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskCard } from './TaskCard.jsx';
import { labelOf, laneToneText, LANE_DRAG_TYPE } from '../utils/lanes.js';

/** True when the in-flight drag is a column reorder, not a card move. */
const isLaneDrag = (event) =>
  Array.from(event.dataTransfer?.types ?? []).includes(LANE_DRAG_TYPE);

/**
 * One kanban lane (§7.6) — a column of the configured board. A lane is a
 * native drag target for pointers and a plain list for keyboards: the card's
 * grip answers Space (lift/drop), ←/→ (aim at the neighbouring lane) and
 * Escape (cancel). The page owns the lift state; the lane only wires events
 * into it.
 *
 * The header carries the column's three facts: its name (the manager's label
 * or the standard one), how many cards it holds, and its WIP limit when one is
 * set — over the limit the count turns red and a line says so, but the server
 * never traps work: limits advise, they do not block. The `+` is the per-lane
 * quick add, opening the new-task form already set to this column.
 *
 * When the server grants `canManage` (passed inside `reorder`), the header also
 * carries a column grip and a delete button: the grip drags to reorder the
 * columns and answers the arrow keys (WCAG 2.5.7 — dragging is never the only
 * route), and delete opens the page's confirm dialog. A column-reorder drag is
 * tagged with its own data type so it never collides with a card move (§7.6).
 *
 * @param {{ lane: object, tasks: object[], className?: string, liftedTaskId?: string|null, dragOver?: boolean, dropValid?: boolean, canDeleteCard?: boolean, canCloseCard?: boolean, reorder?: { canManage: boolean, dragging: boolean, over: boolean, start: (event: object) => void, end: () => void, aim: (laneId: string|null) => void, drop: (event: object) => void, key: (event: object) => void, onDelete: (lane: object) => void }, onOpenTask: (task: object) => void, onGripKeyDown: (event: object, task: object) => void, onLift: (task: object) => void, onDrop: (lane: string) => void, onDragOver: (lane: string|null) => void, onQuickAdd: (lane: object) => void, onAdvance?: (task: object, lane: string) => void, onPushBack?: (task: object) => void, onDelete?: (task: object) => void, onClose?: (task: object) => void }} props
 */
export function BoardLane({
  lane,
  tasks,
  className = '',
  liftedTaskId = null,
  dragOver = false,
  dropValid = true,
  canDeleteCard = false,
  canCloseCard = false,
  reorder,
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
}) {
  const { t } = useTranslation('tasks');
  const label = labelOf(t, lane);
  const over = lane.wipLimit != null && tasks.length > lane.wipLimit;
  const canManage = reorder?.canManage === true;

  return (
    <section
      aria-labelledby={`lane-${lane.id}`}
      data-lane={lane.id}
      onDragOver={(event) => {
        event.preventDefault();
        if (isLaneDrag(event)) {
          event.dataTransfer.dropEffect = 'move';
          reorder?.aim(lane.id);
          return;
        }
        event.dataTransfer.dropEffect = dropValid ? 'move' : 'none';
        onDragOver(lane.id);
      }}
      onDragLeave={() => {
        onDragOver(null);
        reorder?.aim(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const laneDrag =
          isLaneDrag(event) || !!event.dataTransfer?.getData?.(LANE_DRAG_TYPE);
        if (laneDrag) {
          reorder?.drop(event);
          return;
        }
        onDrop(lane.id);
      }}
      className={`border-border bg-surface-sunken/60 flex min-h-40 flex-col gap-2 rounded-card border p-2.5 ${
        dragOver && liftedTaskId ? (dropValid ? 'ring-primary ring-2' : 'ring-danger ring-2') : ''
      } ${reorder?.dragging ? 'opacity-50' : ''} ${
        reorder?.over ? 'ring-primary ring-2' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-1.5 px-1 pt-1">
        {/* The title band is the drag handle for managers/HR: grab anywhere on it
            (grip, title, count) to move the column, and drop it onto another
            column to replace that column's position (§7.6). The + and delete
            buttons sit OUTSIDE the band, so clicking them never starts a drag.
            Keyboard users reorder with ←/→ on the grip (WCAG 2.5.7 — dragging is
            never the only route). */}
        <div
          data-lane-handle={lane.id}
          className={`flex min-w-0 flex-1 items-center gap-1.5 ${
            canManage ? 'cursor-grab select-none rounded active:cursor-grabbing' : ''
          }`}
          draggable={canManage ? true : undefined}
          onDragStart={canManage ? (event) => reorder.start(event) : undefined}
          onDragEnd={canManage ? () => reorder.end() : undefined}
        >
          {canManage ? (
            <button
              type="button"
              aria-label={t('lane.reorder', { lane: label })}
              onKeyDown={(event) => reorder.key(event)}
              className="text-text-faint hover:text-text-muted focus-visible:ring-primary -ml-1 inline-flex h-6 w-4 shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2"
            >
              <GripVertical aria-hidden="true" size={14} strokeWidth={2} />
            </button>
          ) : null}
          <h2
            id={`lane-${lane.id}`}
            className={`min-w-0 flex-1 text-sm font-semibold ${laneToneText(lane.id)}`}
          >
            <span className="truncate">{label}</span>
          </h2>
          <span
            className={`tabular rounded-pill px-2 py-0.5 text-xs font-medium ${
              over ? 'bg-danger-soft text-danger-text' : 'bg-surface text-text-muted'
            }`}
          >
            {lane.wipLimit != null
              ? `${tasks.length}/${lane.wipLimit}`
              : t('laneCount', { count: tasks.length })}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label={t('quickAdd', { lane: label })}
            onClick={() => onQuickAdd(lane)}
            className="text-text-muted hover:text-text focus-visible:ring-primary inline-flex h-6 w-6 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
          >
            <Plus aria-hidden="true" size={14} strokeWidth={2} />
          </button>
          {canManage ? (
            <button
              type="button"
              aria-label={t('tabs.deleteTab', { tab: label })}
              onClick={() => reorder.onDelete(lane)}
              className="text-text-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-danger/40 inline-flex h-6 w-6 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
            >
              <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
            </button>
          ) : null}
        </span>
      </div>

      {over ? (
        <p role="status" className="text-danger-text px-1 text-xs">
          {t('wip.over', { limit: lane.wipLimit })}
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-text-faint px-2 py-4 text-xs">{t('emptyLane')}</p>
      ) : (
        <ul className="grid gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                lifted={liftedTaskId === task.id}
                onOpen={onOpenTask}
                onGripKeyDown={onGripKeyDown}
                onLift={onLift}
                onDragEnd={() => onDragOver(null)}
                onAdvance={onAdvance}
                onPushBack={onPushBack}
                onDelete={canDeleteCard ? onDelete : undefined}
                onClose={canCloseCard ? onClose : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
