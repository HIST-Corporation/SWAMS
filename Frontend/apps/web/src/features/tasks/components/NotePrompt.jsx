import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@swams/ui';
import { CONTROL } from './DialogField.jsx';

/**
 * The revision note prompt (§7.6: moving into Revision requires a short note).
 * Non-modal inline form — focus lands in the textarea, Escape cancels, and
 * the note is handed back only on explicit confirm.
 *
 * @param {{ task: object, onConfirm: (note: string) => void, onCancel: () => void }} props
 */
export function NotePrompt({ task, onConfirm, onCancel }) {
  const { t } = useTranslation('tasks');
  const [note, setNote] = useState('');
  const fieldRef = useRef(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const ready = note.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="note-prompt-heading"
      className="border-warning bg-warning-soft grid gap-3 rounded-card border p-4"
    >
      <h2 id="note-prompt-heading" className="text-md">
        {t('note.title')}
      </h2>
      <p className="text-text-muted text-sm">{task.title}</p>

      <label className="grid gap-1">
        <span className="text-sm font-medium">{t('note.label')}</span>
        <textarea
          ref={fieldRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('note.placeholder')}
          rows={2}
          maxLength={500}
          className={cn(CONTROL, 'h-auto py-2')}
        />
      </label>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!ready}
          onClick={() => ready && onConfirm(note.trim())}
        >
          {t('note.confirm')}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          {t('note.cancel')}
        </Button>
      </div>
    </div>
  );
}
