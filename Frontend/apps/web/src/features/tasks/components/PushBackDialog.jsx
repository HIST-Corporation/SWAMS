import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@swams/ui';
import { CONTROL } from './DialogField.jsx';

const SEVERITIES = ['major', 'minor'];

/**
 * Push Back — Request Revision (the prototype's dialog). Sending a card back
 * needs more than a move: what is wrong, how to fix it, and how badly it
 * blocks. Issue is required (§7.6: Revision needs a note), the other two ride
 * along into the revision history trail.
 *
 * Modal on purpose — the board behind stays inert, focus lands in the issue
 * field, Escape cancels, Tab cycles inside, and the move is only handed back
 * on explicit confirm.
 *
 * @param {{ task: object, onConfirm: (detail: {note: string, suggestion: string, severity: string}) => void, onCancel: () => void }} props
 */
export function PushBackDialog({ task, onConfirm, onCancel }) {
  const { t } = useTranslation('tasks');
  const [issue, setIssue] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [severity, setSeverity] = useState('major');
  const dialogRef = useRef(null);
  const issueRef = useRef(null);

  const ready = issue.trim().length > 0;

  useEffect(() => {
    issueRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /** Escape cancels; Tab cycles inside the dialog. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button, select, textarea')].filter(
        (node) => !node.disabled,
      );
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
  }, [onCancel]);

  const confirm = () => {
    if (!ready) return;
    onConfirm({ note: issue.trim(), suggestion: suggestion.trim(), severity });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-back-title"
        className="bg-bg border-border grid max-h-full w-full max-w-lg gap-3 overflow-y-auto rounded-card border p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 id="push-back-title" className="text-md">
              {t('pushBack.title')}
            </h2>
            <p className="text-text-muted text-sm">{t('pushBack.task', { title: task.title })}</p>
          </div>
          <button
            type="button"
            aria-label={t('pushBack.cancel')}
            onClick={onCancel}
            className="text-text-muted hover:text-text focus-visible:ring-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </header>

        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('pushBack.issue')}</span>
          <textarea
            ref={issueRef}
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            placeholder={t('pushBack.issuePlaceholder')}
            rows={3}
            maxLength={500}
            aria-required="true"
            className={cn(CONTROL, 'h-auto py-2')}
          />
          <span className="text-text-faint text-xs">{t('pushBack.issueRequired')}</span>
        </label>

        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('pushBack.suggestion')}</span>
          <textarea
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            placeholder={t('pushBack.suggestionPlaceholder')}
            rows={2}
            maxLength={500}
            className={cn(CONTROL, 'h-auto py-2')}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('pushBack.severity')}</span>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className={CONTROL}
          >
            {SEVERITIES.map((option) => (
              <option key={option} value={option}>
                {t(`severity.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <footer className="mt-1 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" size="sm" variant="quiet" onClick={onCancel}>
            {t('pushBack.cancel')}
          </Button>
          <Button type="button" size="sm" variant="danger" disabled={!ready} onClick={confirm}>
            {t('pushBack.confirm')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
