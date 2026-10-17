import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@swams/ui';
import { useCreateTask } from '../hooks/useTasks.js';
import { CONTROL } from './DialogField.jsx';
import { NewTaskFields } from './NewTaskFields.jsx';

/** The fields the form owns, in one object so the pickers stay dumb. */
const EMPTY = (lane) => ({
  lane,
  priority: 'normal',
  due: '',
  assigneeId: '',
  reviewerId: '',
  note: '',
  title: '',
  description: '',
});

/**
 * Inline new-task form — the prototype's Add New Task dialog, minus the modal:
 * title, initial status (any configured column), priority, due date, who it is
 * for, and a description. Created straight into Review it asks for the
 * reviewer, into Revision it asks for the note — the §7.6 rules are shown as
 * fields instead of failing after the fact.
 *
 * Client-side validation only guards the obvious (empty title); the mock — and
 * the real API later — owns every other rule and its error copy, which this
 * form shows verbatim. An empty assignee means "the task is mine": the server
 * assigns the creator, so work a staff member raises stays on their board.
 *
 * @param {{ initialLane?: string, lanes?: object[], onClose: () => void, onCreated: (lane: string) => void }} props
 */
export function NewTaskForm({ initialLane = 'todo', lanes = [], onClose, onCreated }) {
  const { t } = useTranslation('tasks');
  const [values, setValues] = useState(() => EMPTY(initialLane));
  const [errorMessage, setErrorMessage] = useState(null);
  const create = useCreateTask({
    onSuccess: () => onCreated(values.lane),
    onError: (error) => setErrorMessage(error.message),
  });

  const ready = values.title.trim().length > 0;

  const set = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (!ready || create.isPending) return;
    setErrorMessage(null);
    const payload = {
      title: values.title.trim(),
      lane: values.lane,
      priority: values.priority,
      description: values.description.trim(),
      due: values.due || null,
    };
    // Omitted, not null: the server reads "no assignee named" as the creator.
    if (values.assigneeId) payload.assigneeId = values.assigneeId;
    if (values.lane === 'review' && values.reviewerId) payload.reviewerId = values.reviewerId;
    if (values.lane === 'revision') payload.note = values.note.trim();
    create.mutate(payload);
  };

  return (
    <form
      aria-label={t('newTask.title')}
      onSubmit={submit}
      className="border-border bg-surface grid gap-3 rounded-card border p-4"
    >
      <label className="grid gap-1">
        <span className="text-text-muted text-xs font-medium">{t('newTask.titleLabel')}</span>
        <input
          value={values.title}
          onChange={set('title')}
          placeholder={t('newTask.titlePlaceholder')}
          maxLength={140}
          aria-required="true"
          className={CONTROL}
        />
      </label>

      <NewTaskFields lanes={lanes} values={values} onChange={set} />

      <label className="grid gap-1">
        <span className="text-text-muted text-xs font-medium">{t('newTask.description')}</span>
        <textarea
          value={values.description}
          onChange={set('description')}
          placeholder={t('newTask.descriptionPlaceholder')}
          rows={2}
          maxLength={2000}
          className={cn(CONTROL, 'h-auto py-2')}
        />
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {errorMessage ? (
          <p role="alert" className="text-danger-text mr-auto text-sm">
            {errorMessage}
          </p>
        ) : null}
        <Button
          type="submit"
          size="sm"
          disabled={!ready || create.isPending}
          loading={create.isPending}
        >
          {create.isPending ? t('newTask.creating') : t('newTask.submit')}
        </Button>
        <Button type="button" size="sm" variant="quiet" onClick={onClose}>
          {t('newTask.cancel')}
        </Button>
      </div>
    </form>
  );
}
