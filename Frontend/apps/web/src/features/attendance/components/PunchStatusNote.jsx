import { AlertTriangle, CloudOff, MapPin, ShieldQuestion, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';

const CHECK_ICON = {
  denied: ShieldQuestion,
  unavailable: MapPin,
  fail: TriangleAlert,
  pass: MapPin,
};

/**
 * Punch card status note (§7.1 non-happy states). Each state says what happened
 * and what to do next — never a bare spinner, never a dead end.
 *
 * @param {{ status: string, context: object, send: (event: object) => void, queuedCount: number }} props
 */
export function PunchStatusNote({ status, context, send, queuedCount }) {
  const { t } = useTranslation('attendance');

  if (status === 'checking') {
    return (
      <p role="status" className="text-text-muted text-sm">
        {t('checking')}
      </p>
    );
  }

  if (status === 'permissionHelp') {
    return (
      <div className="grid gap-2">
        <h3 className="text-md flex items-center gap-2">
          <MapPin aria-hidden="true" size={16} strokeWidth={1.75} />
          {t('permissionHelpTitle')}
        </h3>
        <p className="text-text-muted text-sm">{t('permissionHelpBody')}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => send({ type: 'RETRY' })}>
            {t('tryAgain')}
          </Button>
          {context.allowOverride ? (
            <Button size="sm" variant="secondary" onClick={() => send({ type: 'PUNCH_ANYWAY' })}>
              {t('punchAnyway')}
            </Button>
          ) : null}
          <Button size="sm" variant="quiet" onClick={() => send({ type: 'CANCEL' })}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'queued' || status === 'syncing') {
    return (
      <div
        role="status"
        className="bg-warning-soft text-warning-text flex items-center gap-2 rounded-input px-3 py-2 text-sm"
      >
        <CloudOff aria-hidden="true" size={16} strokeWidth={1.75} />
        <span>{status === 'syncing' ? t('syncing') : t('queued')}</span>
        {status === 'queued' ? (
          <button
            type="button"
            className="ml-auto font-medium underline"
            onClick={() => send({ type: 'SYNC_NOW' })}
          >
            {t('syncNow')}
          </button>
        ) : null}
      </div>
    );
  }

  if (status === 'needsReview') {
    return (
      <div className="grid gap-2" role="status">
        <h3 className="text-md flex items-center gap-2">
          <ShieldQuestion aria-hidden="true" size={16} strokeWidth={1.75} />
          {t('needsReviewTitle')}
        </h3>
        <p className="text-text-muted text-sm">{t('needsReviewBody')}</p>
        {context.needsReviewReason ? (
          <p className="text-text-faint text-xs">
            {t(`exception.${context.needsReviewReason}`, { defaultValue: '' })}
          </p>
        ) : null}
        <ul className="mt-1 grid gap-1 text-sm">
          {context.checks.map((check) => {
            const Icon = CHECK_ICON[check.status] ?? MapPin;
            return (
              <li key={check.id} className="text-text-muted flex items-center gap-2">
                <Icon aria-hidden="true" size={14} strokeWidth={1.75} />
                <span>{t(`checks.${check.id}`)}</span>
                <span className="text-text-faint">{t(`checkResult.${check.status}`)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-1">
          <Button size="sm" onClick={() => send({ type: 'ACK' })}>
            {t('understood')}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="grid gap-2" role="alert">
        <h3 className="text-md flex items-center gap-2">
          <AlertTriangle aria-hidden="true" size={16} strokeWidth={1.75} />
          {t('errorTitle')}
        </h3>
        <p className="text-text-muted text-sm">{context.error?.message ?? t('errorBody')}</p>
        {context.error?.requestId ? (
          <details className="text-text-faint text-sm">
            <summary className="cursor-pointer">{t('details', { ns: 'common' })}</summary>
            <p className="tabular">
              {t('requestId', { ns: 'common', id: context.error.requestId })}
            </p>
          </details>
        ) : null}
        <div className="mt-1 flex gap-2">
          <Button size="sm" onClick={() => send({ type: 'RETRY' })}>
            {t('tryAgain')}
          </Button>
          <Button size="sm" variant="quiet" onClick={() => send({ type: 'DISMISS' })}>
            {t('dismiss', { ns: 'common', defaultValue: 'Dismiss' })}
          </Button>
        </div>
      </div>
    );
  }

  if (queuedCount > 0) {
    return (
      <p role="status" className="text-warning-text text-sm">
        {t('queuedCount', { count: queuedCount })}
      </p>
    );
  }

  return null;
}
