import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';
import { useUpdateTask } from '../hooks/useTasks.js';
import { toDraft, toPatch } from '../utils/draft.js';
import { ChecklistEditor } from './ChecklistEditor.jsx';
import { TaskDetailFields } from './TaskDetailFields.jsx';

/**
 * The task detail panel (§7.6, contract request 22). Last element of the
 * board's model, not a second board: one task's fields, its to-do list, and
 * the lane — as a labelled `select`, so moving work never depends on dragging
 * (WCAG 2.5.7) and works with one pointer or the keyboard.
 *
 * One explicit transaction: the button saves every changed field at once and
 * the server's answer is the only source of truth. A patch it refuses (Review
 * without a reviewer, Revision without a note, blank title) is shown verbatim
 * and nothing flashes as saved. Escape closes — twice when the draft is dirty,
 * so unsaved words are never dropped silently — and focus returns to the card
 * the page remembers.
 *
 * @param {{ task: object, lanes?: object[], onClose: () => void }} props
 */
export function TaskDetailDialog({ task, lanes = [], onClose }) {
  const { t } = useTranslation('tasks');
  const panelRef = useRef(null);
  const titleRef = useRef(null);
  const [draft, setDraft] = useState(() => toDraft(task));
  const [feedback, setFeedback] = useState(null); // { tone: 'success' | 'error', text }
  const [confirmClose, setConfirmClose] = useState(false);

  const patch = toPatch(draft, task);
  const dirty = Object.keys(patch).length > 0;

  const update = useUpdateTask({
    onSuccess: (response) => {
      setDraft(toDraft(response.record));
      setFeedback({ tone: 'success', text: t('detail.saved') });
    },
    onError: (error) => setFeedback({ tone: 'error', text: error.message }),
  });

  const set = (key) => (event) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  // APG dialog: focus moves inside on open, and the page behind stops scrolling.
  useEffect(() => {
    titleRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const requestClose = () => {
    if (dirty && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  /** Escape closes, Tab cycles inside the panel — the page behind is inert. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll('button, input, select, textarea, [href]'),
      ].filter((node) => !node.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  const save = (event) => {
    event.preventDefault();
    if (!dirty || update.isPending) return;
    setFeedback(null);
    update.mutate({ id: task.id, patch });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--overlay)]">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="bg-bg border-border flex h-full w-full flex-col gap-4 overflow-y-auto border-l p-4 sm:max-w-[34rem] sm:p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <p className="text-text-faint text-xs">{t('detail.eyebrow', { id: task.id })}</p>
            <h2 id="task-dialog-title" className="text-md">
              {t('detail.heading')}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t('detail.close')}
            onClick={requestClose}
            className="text-text-muted hover:text-text focus-visible:ring-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </header>

        <form id="task-detail-fields" onSubmit={save} className="grid gap-3">
          <TaskDetailFields draft={draft} onChange={set} titleRef={titleRef} lanes={lanes} />
        </form>

        <ChecklistEditor
          task={task}
          onError={(message) => setFeedback({ tone: 'error', text: message })}
        />

        {confirmClose ? (
          <div
            role="alert"
            className="border-warning bg-warning-soft grid gap-2 rounded-card border p-3"
          >
            <p className="text-sm">{t('detail.dirty')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" size="sm" onClick={onClose}>
                {t('detail.discard')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmClose(false)}>
                {t('detail.keepEditing')}
              </Button>
            </div>
          </div>
        ) : null}

        <footer className="border-border mt-auto flex flex-wrap items-center gap-3 border-t pt-4">
          <Button
            type="submit"
            form="task-detail-fields"
            size="sm"
            disabled={!dirty || update.isPending}
            loading={update.isPending}
          >
            {update.isPending ? t('detail.saving') : t('detail.save')}
          </Button>
          <Button variant="secondary" size="sm" onClick={requestClose}>
            {t('detail.cancel')}
          </Button>
          {feedback ? (
            <p
              role={feedback.tone === 'error' ? 'alert' : 'status'}
              className={`text-xs ${feedback.tone === 'error' ? 'text-danger-text' : 'text-success-text'}`}
            >
              {feedback.text}
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
