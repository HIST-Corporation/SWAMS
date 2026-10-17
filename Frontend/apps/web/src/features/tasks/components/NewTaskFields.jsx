import { useTranslation } from 'react-i18next';
import { PEOPLE } from '../mocks/seeds.js';
import { PRIORITIES } from '../utils/draft.js';
import { labelOf } from '../utils/lanes.js';
import { CONTROL } from './DialogField.jsx';

/**
 * The new-task form's pickers, in one row that wraps. Which fields appear is a
 * function of the chosen column: Review asks for the reviewer, Revision asks
 * for the note — the §7.6 rules shown as fields rather than discovered from a
 * failed submit.
 *
 * An empty assignee means "mine": the server assigns the creator, so work a
 * staff member raises stays on their own board under the hierarchy scope.
 *
 * Every control uses the shared `CONTROL` recipe (44px, 16px text, focus ring)
 * so this form reads as one family with the detail, push-back and settings
 * dialogs.
 *
 * @param {{ lanes: object[], values: object, onChange: (key: string) => (event: object) => void }} props
 */
export function NewTaskFields({ lanes, values, onChange }) {
  const { t } = useTranslation('tasks');

  return (
    // `items-start`, not `items-end`: Assignee/Reviewer carry a hint line
    // beneath their control, so bottom-aligning the row would push those
    // selects above the hint-less fields (Lane/Priority/Due). Top-aligning
    // keeps every control on one line, with hints hanging below their own field.
    <div className="flex flex-wrap items-start gap-3">
      <label className="grid min-w-0 grow basis-36 gap-1">
        <span className="text-text-muted text-xs font-medium">{t('newTask.lane')}</span>
        <select value={values.lane} onChange={onChange('lane')} className={CONTROL}>
          {lanes.map((option) => (
            <option key={option.id} value={option.id}>
              {labelOf(t, option)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid min-w-0 grow basis-32 gap-1">
        <span className="text-text-muted text-xs font-medium">{t('newTask.priority')}</span>
        <select value={values.priority} onChange={onChange('priority')} className={CONTROL}>
          {PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {t(`priority.${option}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid min-w-0 grow basis-36 gap-1">
        <span className="text-text-muted text-xs font-medium">{t('newTask.due')}</span>
        <input type="date" value={values.due} onChange={onChange('due')} className={CONTROL} />
      </label>

      <label className="grid min-w-0 grow basis-40 gap-1">
        <span className="text-text-muted text-xs font-medium">{t('newTask.assignee')}</span>
        <select value={values.assigneeId} onChange={onChange('assigneeId')} className={CONTROL}>
          <option value="">{t('newTask.assigneeNone')}</option>
          {PEOPLE.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        {!values.assigneeId ? (
          <span className="text-text-faint text-xs">{t('newTask.assigneeHint')}</span>
        ) : null}
      </label>

      {values.lane === 'review' ? (
        <label className="grid min-w-0 grow basis-40 gap-1">
          <span className="text-text-muted text-xs font-medium">{t('newTask.reviewer')}</span>
          <select value={values.reviewerId} onChange={onChange('reviewerId')} className={CONTROL}>
            <option value="">{t('newTask.reviewerNone')}</option>
            {PEOPLE.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <span className="text-text-faint text-xs">{t('newTask.reviewerHint')}</span>
        </label>
      ) : null}

      {values.lane === 'revision' ? (
        <label className="grid min-w-0 grow basis-56 gap-1">
          <span className="text-text-muted text-xs font-medium">{t('newTask.note')}</span>
          <input
            value={values.note}
            onChange={onChange('note')}
            placeholder={t('newTask.notePlaceholder')}
            maxLength={500}
            className={CONTROL}
          />
        </label>
      ) : null}
    </div>
  );
}
