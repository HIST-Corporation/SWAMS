import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@swams/ui';
import { CONTROL } from './DialogField.jsx';
import { useUpdateLane } from '../hooks/useTasks.js';
import { labelOf } from '../utils/lanes.js';

/**
 * One column's controls in the board-settings dialog: rename (blank keeps the
 * standard label on a workflow lane) and set the WIP limit (blank = none).
 * Saving shows the server's answer verbatim — a duplicate name or a bad limit
 * is refused here, not swallowed.
 *
 * @param {{ lane: object, onSaved?: () => void }} props
 */
export function LaneRowEditor({ lane, onSaved }) {
  const { t } = useTranslation('tasks');
  const [name, setName] = useState(lane.name ?? '');
  const [wip, setWip] = useState(lane.wipLimit == null ? '' : String(lane.wipLimit));
  const [feedback, setFeedback] = useState(null); // { tone: 'status' | 'alert', text }

  const update = useUpdateLane({
    onSuccess: () => {
      setFeedback({ tone: 'status', text: t('settings.updated') });
      onSaved?.();
    },
    onError: (error) => setFeedback({ tone: 'alert', text: error.message }),
  });

  const wipNumber = wip.trim() === '' ? null : Number(wip.trim());
  const dirty =
    name.trim() !== (lane.name ?? '') ||
    (lane.wipLimit == null ? wip.trim() !== '' : wip.trim() !== String(lane.wipLimit));

  const save = (event) => {
    event.preventDefault();
    if (!dirty || update.isPending) return;
    setFeedback(null);
    update.mutate({ id: lane.id, patch: { name: name.trim(), wipLimit: wipNumber } });
  };

  return (
    <form onSubmit={save} className="border-border grid gap-2 rounded-card border p-3">
      <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1">
            <span className="text-text-muted text-xs font-medium">{t('settings.name')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={labelOf(t, lane)}
              maxLength={40}
              className={CONTROL}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-text-muted text-xs font-medium">{t('settings.wip')}</span>
            <input
              type="number"
              min="1"
              max="99"
              value={wip}
              onChange={(event) => setWip(event.target.value)}
              placeholder="—"
              className={cn(CONTROL, 'w-24')}
            />
          </label>
        <Button
          type="submit"
          size="sm"
          disabled={!dirty || update.isPending}
          loading={update.isPending}
        >
          {update.isPending ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
      <p className="text-text-faint text-xs">{t('settings.wipHint')}</p>
      {feedback ? (
        <p
          role={feedback.tone === 'alert' ? 'alert' : 'status'}
          className={`text-xs ${feedback.tone === 'alert' ? 'text-danger-text' : 'text-success-text'}`}
        >
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
