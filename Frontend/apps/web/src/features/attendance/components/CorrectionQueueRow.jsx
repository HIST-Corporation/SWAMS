import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Textarea } from '@swams/ui';
import { useCorrectionReview } from '../hooks/useCorrectionReview.js';

/**
 * One request in the reviewer bench (§7.5): both punches side by side, then the
 * three decisions. The note composer serves both `reject` and `request_info`
 * because the API requires a note for anything but an approval.
 *
 * @param {{ row: object }} props
 */
export function CorrectionQueueRow({ row }) {
  const { t } = useTranslation('attendance');
  const { status, error, decide, retry } = useCorrectionReview(row);
  const [asking, setAsking] = useState(null);
  const [note, setNote] = useState('');

  const busy = status === 'committing';
  const noteMissing = note.trim().length === 0;
  const closeComposer = () => {
    setAsking(null);
    setNote('');
  };

  return (
    <li className="bg-surface border-border rounded-card border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.requester}</p>
          <time dateTime={row.date} className="tabular text-text-muted text-xs">
            {row.date}
          </time>
        </div>
        <Badge tone={row.status === 'needs_info' ? 'warning' : 'info'}>
          {t(`corrections.status.${row.status}`, { defaultValue: row.status })}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 text-sm">
        <div className="flex flex-col">
          <dt className="text-text-faint text-xs">{t('corrections.original')}</dt>
          <dd className="tabular text-text-muted">{formatPunch(row.original)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-text-faint text-xs">{t('corrections.proposed')}</dt>
          <dd className="tabular">{formatPunch(row.proposed)}</dd>
        </div>
      </dl>

      {row.reason ? <p className="text-text-faint mt-2 text-sm">{row.reason}</p> : null}

      {status === 'error' ? (
        <div
          role="alert"
          className="bg-danger-soft text-danger-text rounded-input mt-3 flex items-start gap-2 px-3 py-2 text-sm"
        >
          <AlertTriangle aria-hidden="true" size={16} strokeWidth={1.75} />
          <span>
            {error?.message ?? t('errorTitle')}
            {error?.requestId ? (
              <span className="block text-xs opacity-80">
                {t('requestId', { ns: 'common', id: error.requestId })}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      {SETTLED[status] ? (
        <p role="status" className="text-text-muted mt-3 text-sm">
          {t(`corrections.status.${SETTLED[status]}`)}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={retry}>
            {t('tryAgain')}
          </Button>
        </div>
      ) : null}

      {status === 'inReview' || status === 'deciding' ? (
        asking ? (
          <div className="mt-3 grid gap-2">
            <Textarea
              rows={2}
              aria-label={t('team.notePlaceholder')}
              placeholder={t('team.notePlaceholder')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {noteMissing ? (
              <p className="text-text-muted text-xs">{t('team.noteRequired')}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={busy}
                disabled={noteMissing}
                onClick={() => {
                  decide(asking, note.trim());
                  closeComposer();
                }}
              >
                {asking === 'reject' ? t('team.reject') : t('team.send')}
              </Button>
              <Button size="sm" variant="quiet" onClick={closeComposer}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" loading={busy} disabled={busy} onClick={() => decide('approve')}>
              {t('team.approve')}
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => setAsking('reject')}>
              {t('team.reject')}
            </Button>
            <Button
              size="sm"
              variant="quiet"
              disabled={busy}
              onClick={() => setAsking('request_info')}
            >
              {t('team.askInfo')}
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}

/** Machine state → the server status whose label we echo back. */
const SETTLED = { approved: 'approved', rejected: 'rejected', needsInfo: 'needs_info' };

/** "09:38 → 16:20", or a dash when the punch never happened. */
function formatPunch(punch) {
  if (!punch) return '—';
  return `${punch.clockIn ?? '—'} → ${punch.clockOut ?? '—'}`;
}
