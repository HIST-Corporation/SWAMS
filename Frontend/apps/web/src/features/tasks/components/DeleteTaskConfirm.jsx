import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';

/**
 * Confirmation dialog for deleting a single task from the board's task
 * section. States the side effect up front ("cannot be undone") and offers
 * only `Delete` / `Cancel`, mirroring the column (tab) delete dialog so both
 * destructive actions feel the same.
 *
 * A controlled leaf: closing is the parent's job. Escape and the backdrop
 * cancel; focus lands on the close button and Tab cycles inside the dialog.
 *
 * @param {{ open: boolean, title: string, onConfirm: () => void, onCancel: () => void }} props
 */
export function DeleteTaskConfirm({ open, title, onConfirm, onCancel }) {
  const { t } = useTranslation('tasks');
  const closeRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button, a')].filter(
        (node) => !node.disabled && node.getAttribute('aria-hidden') !== 'true',
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
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
        className="bg-surface border-border w-full max-w-sm rounded-card border p-5 shadow-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="delete-task-title" className="text-text text-lg font-display">
              {t('deleteTask.confirmTitle')}
            </h2>
            <p className="text-text-muted mt-1 text-sm">
              {t('deleteTask.message', { title })}
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            aria-label={t('detail.close')}
            onClick={onCancel}
            className="border-border text-text-muted hover:text-text focus-visible:ring-primary rounded-input border"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            {t('deleteTask.cancel')}
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onConfirm}>
            {t('deleteTask.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
