import { cn } from '@swams/ui';
import { useTranslation } from 'react-i18next';
import { LANES, PEOPLE } from '../mocks/seeds.js';
import { PRIORITIES } from '../utils/draft.js';
import { labelOf } from '../utils/lanes.js';
import { CONTROL, Field } from './DialogField.jsx';

/** A person picker: roster people, plus the empty option that clears the field. */
function PersonSelect({ value, onChange, noneLabel }) {
  return (
    <select value={value} onChange={onChange} className={CONTROL}>
      <option value="">{noneLabel}</option>
      {PEOPLE.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>
  );
}

/**
 * The detail panel's controls — everything about a task except its to-do list.
 * The lane is a labelled `select` on purpose: Review needs a reviewer and
 * Revision needs a note, so the panel says so under the field instead of
 * letting a move fail silently, and moving work needs no dragging at all.
 *
 * @param {{ draft: object, onChange: (key: string) => (event: object) => void, titleRef: object, lanes?: object[] }} props
 */
export function TaskDetailFields({ draft, onChange, titleRef, lanes = [] }) {
  const { t } = useTranslation('tasks');
  const laneOptions = lanes.length > 0 ? lanes : LANES.map((id) => ({ id, name: null }));

  return (
    <>
      <Field label={t('detail.fields.title')}>
        <input
          ref={titleRef}
          value={draft.title}
          onChange={onChange('title')}
          maxLength={140}
          aria-required="true"
          className={CONTROL}
        />
      </Field>

      <Field label={t('detail.fields.description')}>
        <textarea
          value={draft.description}
          onChange={onChange('description')}
          rows={3}
          maxLength={2000}
          placeholder={t('detail.fields.descriptionPlaceholder')}
          className={cn(CONTROL, 'h-auto py-2')}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('detail.fields.lane')} hint={t('detail.fields.laneHint')}>
          <select value={draft.lane} onChange={onChange('lane')} className={CONTROL}>
            {laneOptions.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {labelOf(t, lane)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('detail.fields.priority')}>
          <select value={draft.priority} onChange={onChange('priority')} className={CONTROL}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`priority.${priority}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('detail.fields.due')}>
          <input type="date" value={draft.due} onChange={onChange('due')} className={CONTROL} />
        </Field>
        <Field label={t('detail.fields.assignee')}>
          <PersonSelect
            value={draft.assigneeId}
            onChange={onChange('assigneeId')}
            noneLabel={t('detail.fields.none')}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('detail.fields.reviewer')}>
          <PersonSelect
            value={draft.reviewerId}
            onChange={onChange('reviewerId')}
            noneLabel={t('detail.fields.none')}
          />
        </Field>
        <Field
          label={t('detail.fields.note')}
          hint={draft.lane === 'revision' ? t('detail.fields.noteRequired') : undefined}
        >
          <input
            value={draft.note}
            onChange={onChange('note')}
            maxLength={500}
            className={CONTROL}
          />
        </Field>
      </div>
    </>
  );
}
