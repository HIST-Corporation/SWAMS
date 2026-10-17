import { Check, Play, RotateCcw, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';

/**
 * The card's one-tap lane actions (the prototype's card buttons). Which ones
 * show is a function of the card's lane: Start in To do and Revision, Send to
 * review while in progress, Approve + Push back in Review, none in Done — the
 * same moves the drag and keyboard paths make, so nobody has to drag to run
 * the workflow. Push back opens the issue dialog instead of moving at once,
 * because Revision requires a note (§7.6).
 *
 * @param {{ task: object, onAdvance?: (task: object, lane: string) => void, onPushBack?: (task: object) => void }} props
 */
export function CardActions({ task, onAdvance, onPushBack }) {
  const { t } = useTranslation('tasks');
  if (task.lane === 'done' || (!onAdvance && !onPushBack)) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {task.lane === 'todo' || task.lane === 'revision' ? (
        <Button
          type="button"
          size="sm"
          className="grow"
          onClick={() => onAdvance?.(task, 'in_progress')}
        >
          <Play aria-hidden="true" size={13} strokeWidth={2} />
          {t('actions.start')}
        </Button>
      ) : null}

      {task.lane === 'in_progress' ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="grow"
          onClick={() => onAdvance?.(task, 'review')}
        >
          <Send aria-hidden="true" size={13} strokeWidth={2} />
          {t('actions.sendReview')}
        </Button>
      ) : null}

      {task.lane === 'review' ? (
        <>
          <Button
            type="button"
            size="sm"
            className="grow"
            onClick={() => onAdvance?.(task, 'done')}
          >
            <Check aria-hidden="true" size={13} strokeWidth={2} />
            {t('actions.approve')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="grow"
            onClick={() => onPushBack?.(task)}
          >
            <RotateCcw aria-hidden="true" size={13} strokeWidth={2} />
            {t('actions.pushBack')}
          </Button>
        </>
      ) : null}
    </div>
  );
}
