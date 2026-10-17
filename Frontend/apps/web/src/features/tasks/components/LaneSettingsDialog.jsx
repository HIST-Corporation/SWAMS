import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@swams/ui';
import { useCreateLane } from '../hooks/useTasks.js';
import { CONTROL } from './DialogField.jsx';
import { LaneRowEditor } from './LaneRowEditor.jsx';

/**
 * Board settings — the \"more slots for tasks\" dialog (manager/HR only; the
 * page shows the button only when the server says `canManage`, and the server
 * re-checks with 403 `not_allowed`). Every column can be renamed and given a
 * WIP limit; new columns are appended after Done so the workflow lanes never
 * move under anybody's feet.
 *
 * Modal: focus lands on the first field, Escape closes, clicking the backdrop
 * closes, and Tab cycles inside.
 *
 * @param {{ lanes: object[], onClose: () => void }} props
 */
export function LaneSettingsDialog({ lanes, onClose }) {
  const { t } = useTranslation('tasks');
  const [name, setName] = useState('');
  const [wip, setWip] = useState('');
  const [feedback, setFeedback] = useState(null); // { tone, text }
  const dialogRef = useRef(null);
  const nameRef = useRef(null);

  const add = useCreateLane({
    onSuccess: () => {
      setName('');
      setWip('');
      setFeedback({ tone: 'status', text: t('settings.added') });
    },
    onError: (error) => setFeedback({ tone: 'alert', text: error.message }),
  });

  useEffect(() => {
    nameRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /** Escape closes; Tab cycles inside the dialog. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button, input')].filter(
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
  }, [onClose]);

  // A press that starts outside the dialog box (on the backdrop, or anywhere
  // else on the page) dismisses it — the same affordance as Escape. Guarded
  // with `contains` so a press inside never closes it. `mousedown` (not
  // `click`) means a drag-select that ends outside can't close it mid-gesture,
  // and it matches the topbar disclosures (NotificationBell, UserMenu).
  useEffect(() => {
    const onMouseDown = (event) => {
      if (!dialogRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim() || add.isPending) return;
    setFeedback(null);
    add.mutate({ name: name.trim(), wipLimit: wip.trim() === '' ? null : Number(wip.trim()) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lane-settings-title"
        className="bg-bg border-border grid max-h-full w-full max-w-xl gap-4 overflow-y-auto rounded-card border p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2 id="lane-settings-title" className="text-md">
              {t('settings.title')}
            </h2>
            <p className="text-text-muted text-sm">{t('settings.intro')}</p>
          </div>
          <button
            type="button"
            aria-label={t('settings.close')}
            onClick={onClose}
            className="text-text-muted hover:text-text focus-visible:ring-primary inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </header>

        <section aria-label={t('settings.title')} className="grid gap-2">
          {lanes.map((lane) => (
            <LaneRowEditor key={lane.id} lane={lane} />
          ))}
        </section>

        <form onSubmit={submit} className="border-border grid gap-2 border-t pt-4">
          <p className="text-sm font-medium">{t('settings.addTitle')}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-0 grow basis-44 gap-1">
              <span className="text-text-muted text-xs font-medium">{t('settings.newName')}</span>
              <input
                ref={nameRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('settings.newName')}
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
              disabled={!name.trim() || add.isPending}
              loading={add.isPending}
            >
              {t('settings.add')}
            </Button>
          </div>
          {feedback ? (
            <p
              role={feedback.tone === 'alert' ? 'alert' : 'status'}
              className={`text-xs ${feedback.tone === 'alert' ? 'text-danger-text' : 'text-success-text'}`}
            >
              {feedback.text}
            </p>
          ) : null}
        </form>

        <footer className="flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>
            {t('settings.close')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
