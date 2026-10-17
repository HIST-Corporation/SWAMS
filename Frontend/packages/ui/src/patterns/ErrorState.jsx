import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../primitives/Button.jsx';

/**
 * Error state (Section 10): says what happened and what to do, shows the
 * requestId collapsed under "Details", offers retry. No apology, no blame (8.8).
 * @param {{ title?: string, message: string, requestId?: string, onRetry?: () => void, retryLabel?: string }} props
 */
export function ErrorState({ title, message, requestId, onRetry, retryLabel }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="bg-surface border-danger-soft mx-auto flex max-w-[480px] flex-col items-start gap-3 rounded-card border px-6 py-6"
    >
      <div className="bg-danger-soft text-danger-text flex h-10 w-10 items-center justify-center rounded-pill">
        <AlertTriangle aria-hidden="true" size={18} strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <h2 className="text-md">{title ?? t('state.error')}</h2>
        <p className="text-text-muted text-sm">{message}</p>
      </div>
      {requestId ? (
        <details className="text-text-faint text-sm">
          <summary className="cursor-pointer">{t('details')}</summary>
          <p className="tabular">Request ID: {requestId}</p>
        </details>
      ) : null}
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          {retryLabel ?? t('actions.retry')}
        </Button>
      ) : null}
    </div>
  );
}
