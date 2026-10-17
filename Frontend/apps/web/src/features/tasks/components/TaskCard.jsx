import { AlertCircle, Archive, GripVertical, ListChecks, Maximize2, MessageSquareWarning, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';
import { nepalIso } from '../utils/nepal.js';
import { CardActions } from './CardActions.jsx';

/** Priority → badge tone; the word is always the badge text (§8.9). */
const PRIORITY_TONE = { low: 'neutral', normal: 'info', high: 'warning' };

/**
 * One card on the board (§7.6). Three things live on it, and nothing else:
 * the title (a real button that opens the task — mouse, touch and keyboard all
 * use the same control), the facts that change how you triage it (priority,
 * assignee, due, checklist progress, revision note), and a grip.
 *
 * The grip is the single drag/keyboard handle: pointer users drag from it, and
 * keyboard users lift with Space, aim with ←/→, drop with Space, cancel with
 * Escape while it has focus. Dragging is never the ONLY way to move a card —
 * the detail panel's "Lane" selector does the same job with one pointer or the
 * keyboard, which is what WCAG 2.5.7 asks for.
 *
 * Below the facts sit the lane's one-tap actions (the prototype's card
 * buttons): Start, Send to review, Approve and Push back — the same moves the
 * drag and keyboard paths make, so nobody has to drag to run the workflow.
 * Push back opens the issue/suggestion/severity dialog instead of moving at
 * once, because Revision requires a note (§7.6).
 *
 * The footer pairs the grip with an Open affordance and, gated by column, one
 * removal: the FIRST column passes `onDelete` (a clean "cancel" of work that
 * never started), the workflow's LAST column (Done) passes `onClose` instead —
 * the card retires into the completed history below the board, where it stays
 * openable — and mid-flight columns pass neither (§7.6). Absence of the prop
 * is what hides the button, keeping the card unaware of column order.
 *
 * @param {{ task: object, lifted?: boolean, onOpen: (task: object, event: object) => void, onGripKeyDown: (event: object, task: object) => void, onLift: (task: object) => void, onDragEnd: () => void, onAdvance?: (task: object, lane: string) => void, onPushBack?: (task: object) => void, onDelete?: (task: object) => void, onClose?: (task: object) => void }} props
 */
export function TaskCard({
  task,
  lifted = false,
  onOpen,
  onGripKeyDown,
  onLift,
  onDragEnd,
  onAdvance,
  onPushBack,
  onDelete,
  onClose,
}) {
  const { t, i18n } = useTranslation('tasks');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const overdue = task.due && task.lane !== 'done' && task.due < nepalIso();

  const items = task.checklist ?? [];
  const doneCount = items.filter((item) => item.done).length;

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        onLift(task);
      }}
      onDragEnd={onDragEnd}
      className={`bg-surface border-border grid gap-2 rounded-input border px-3 py-2.5 ${
        lifted ? 'border-primary ring-primary shadow-2 ring-1' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={(event) => onOpen(task, event)}
          className="focus-visible:ring-primary min-w-0 flex-1 rounded-input text-left text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2"
        >
          {task.title}
        </button>
        <Badge tone={PRIORITY_TONE[task.priority] ?? 'neutral'}>
          {t(`priority.${task.priority}`)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {task.assignee ? (
          <span className="text-text-muted inline-flex items-center gap-1.5">
            <Avatar name={task.assignee.name} size="sm" />
            {task.assignee.name}
          </span>
        ) : (
          <span className="text-text-faint">{t('unassigned')}</span>
        )}

        {task.due ? (
          <span
            className={`tabular ${overdue ? 'text-danger-text font-medium' : 'text-text-faint'}`}
          >
            {overdue ? (
              <span className="inline-flex items-center gap-1">
                <AlertCircle aria-hidden="true" size={13} strokeWidth={2} />
                {t('overdue')}
              </span>
            ) : (
              t('due', {
                when: formatDateAd(new Date(`${task.due}T12:00:00.000Z`), { locale }),
              })
            )}
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="grid gap-1">
          <p className="text-text-muted inline-flex items-center gap-1.5 text-xs">
            <ListChecks aria-hidden="true" size={13} strokeWidth={2} />
            {t('card.checklist', { done: doneCount, total: items.length })}
          </p>
          <span
            aria-hidden="true"
            className="bg-surface-sunken block h-1 w-full overflow-hidden rounded-pill"
          >
            <span
              className={`block h-full ${doneCount === items.length ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${Math.round((doneCount / items.length) * 100)}%` }}
            />
          </span>
        </div>
      ) : null}

      {task.note ? (
        <p className="text-warning-text inline-flex items-start gap-1.5 text-xs">
          <MessageSquareWarning aria-hidden="true" size={13} strokeWidth={2} className="mt-0.5" />
          {t('card.note', { note: task.note })}
        </p>
      ) : null}

      <CardActions task={task} onAdvance={onAdvance} onPushBack={onPushBack} />

      <div className="border-border/60 mt-0.5 flex items-center gap-2 border-t pt-2">
        <button
          type="button"
          aria-label={t('card.grip', { title: task.title })}
          aria-describedby="board-keyboard-help"
          onKeyDown={(event) => onGripKeyDown(event, task)}
          className="border-border text-text-muted hover:text-text focus-visible:ring-primary inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-input border focus-visible:outline-none focus-visible:ring-2 active:cursor-grabbing"
        >
          <GripVertical aria-hidden="true" size={14} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={(event) => onOpen(task, event)}
          className="border-border bg-surface text-text-muted hover:border-primary hover:text-primary focus-visible:ring-primary ml-auto inline-flex items-center gap-1.5 rounded-input border px-2.5 py-1 text-xs font-medium transition-colors duration-feedback focus-visible:outline-none focus-visible:ring-2"
        >
          <Maximize2 aria-hidden="true" size={13} strokeWidth={2} />
          {t('card.open')}
        </button>

        {onDelete ? (
          <button
            type="button"
            aria-label={t('card.delete', { title: task.title })}
            onClick={() => onDelete(task)}
            className="text-text-muted hover:bg-danger-soft hover:text-danger focus-visible:ring-danger/40 inline-flex h-7 w-7 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
          >
            <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
          </button>
        ) : null}

        {onClose ? (
          <button
            type="button"
            aria-label={t('card.close')}
            title={t('card.close')}
            onClick={() => onClose(task)}
            className="text-text-muted hover:bg-success-soft hover:text-success-text focus-visible:ring-primary inline-flex h-7 w-7 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
          >
            <Archive aria-hidden="true" size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
