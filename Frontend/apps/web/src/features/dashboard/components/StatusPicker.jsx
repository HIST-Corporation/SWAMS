import { useTranslation } from 'react-i18next';
import { cn } from '@swams/ui';
import { AVAILABILITY, usePresenceStore } from '../../../stores/presence.js';

/** Availability value → status dot tone. Words always accompany the dot (§8.9). */
const DOT = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warning',
  do_not_disturb: 'bg-violet',
  offline: 'bg-text-muted/60',
};

/**
 * Your availability control (online / busy / away / offline). A client-side
 * preference persisted on this device — the review queue and session logic
 * never read it, it only tells teammates what to expect.
 */
export function StatusPicker() {
  const { t } = useTranslation('dashboard');
  const status = usePresenceStore((state) => state.status);
  const setStatus = usePresenceStore((state) => state.setStatus);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-text-muted text-xs font-medium">{t('status.label')}</span>
      <div role="radiogroup" aria-label={t('status.label')} className="flex flex-wrap gap-1.5">
        {AVAILABILITY.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={status === option}
            onClick={() => setStatus(option)}
            className={cn(
              'border-border text-text-muted inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium transition',
              'hover:bg-surface-sunken',
              status === option && 'border-primary bg-primary-soft text-primary',
            )}
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${DOT[option]}`} />
            {t(`status.${option}`)}
          </button>
        ))}
      </div>
      <span className="text-text-faint text-xs">{t('status.hint')}</span>
    </div>
  );
}
