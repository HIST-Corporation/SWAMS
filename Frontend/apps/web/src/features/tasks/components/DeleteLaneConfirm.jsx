import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';

/**
 * Confirmation dialog for deleting a board column (the whole tab).
 *
 * Confirms with the user and states the side effect up front: a column's
 * tasks are readded to the first remaining column so nothing is lost.
 * `Delete` / `Cancel` are the only actions.
 *
 * @param {{ open: boolean, laneName: string, laneCount: number, firstRemainingName: string | null, onConfirm: () => void, onCancel: () => void }} props
 */
export function DeleteLaneConfirm({
  open,
  laneName,
  laneCount,
  firstRemainingName,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation('tasks');
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
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
        aria-labelledby="delete-lane-title"
        className="bg-surface border-border w-full max-w-sm rounded-card border p-5 shadow-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="delete-lane-title" className="text-text text-lg font-display">
              {t('deleteLane.confirmTitle', { lane: laneName })}
            </h2>
            <p className="text-text-muted mt-1 text-sm">
              {t('deleteLane.message', {
                lane: laneName,
                count: laneCount,
                first: firstRemainingName ?? t('deleteLane.none'),
              })}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('detail.close')}
            onClick={onCancel}
            className="border-border text-text-muted hover:text-text focus-visible:ring-primary rounded-input border"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            {t('deleteLane.cancel')}
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onConfirm}>
            {t('deleteLane.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
