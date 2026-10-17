import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, EmptyState, ErrorState, Skeleton, Textarea } from '@swams/ui';
import { useState } from 'react';
import { useDecideLeaveRequest } from '../hooks/useLeave.js';
import { formatRange } from '../utils/formatRange.js';

/**
 * Reviewer bench (§7.6). Each row owns its own decision state so two decisions
 * can be in flight without one blocking the other. A rejection is never silent:
 * the reviewer is asked for a note the requester will see.
 * @param {{ rows: object[], isLoading?: boolean, error?: object, onRetry?: () => void }} props
 */
export function ApprovalQueue({ rows, isLoading = false, error, onRetry }) {
  const { t } = useTranslation('leave');

  if (isLoading) {
    return (
      <div className="grid gap-3" aria-busy="true">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="rounded-card h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle aria-hidden="true" size={20} strokeWidth={1.75} />}
        title={t('queue.emptyTitle')}
        body={t('queue.emptyBody')}
      />
    );
  }

  return (
    <ul aria-label={t('queue.title')} className="grid gap-3">
      {rows.map((row) => (
        <ApprovalQueueRow key={row.id} row={row} />
      ))}
    </ul>
  );
}

/** One pending request with its approve / reject actions. */
function ApprovalQueueRow({ row }) {
  const { t, i18n } = useTranslation('leave');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const decide = useDecideLeaveRequest();
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const busy = decide.isPending;
  const noteMissing = rejecting && note.trim().length === 0;

  return (
    <li className="bg-surface border-border rounded-card border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.employee?.name}</p>
          <p className="tabular text-text-muted text-xs">
            {t('queue.meta', {
              range: formatRange(row.start, row.end, locale),
              days: t('days', { count: row.days }),
            })}
          </p>
        </div>
        <Badge tone="info">{t(`types.${row.type}`)}</Badge>
      </div>

      {row.note ? <p className="text-text-faint mt-2 text-sm">{row.note}</p> : null}

      {decide.isError ? (
        <div
          role="alert"
          className="bg-danger-soft text-danger-text rounded-input mt-3 flex items-start gap-2 px-3 py-2 text-sm"
        >
          <AlertTriangle aria-hidden="true" size={16} strokeWidth={1.75} />
          <span>
            {decide.error?.message ?? t('queue.errorBody')}
            {decide.error?.requestId ? (
              <span className="block text-xs opacity-80">
                {t('requestId', { ns: 'common', id: decide.error.requestId })}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      {rejecting ? (
        <div className="mt-3 grid gap-2">
          <Textarea
            rows={2}
            aria-label={t('queue.notePlaceholder')}
            placeholder={t('queue.notePlaceholder')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {noteMissing ? (
            <p className="text-text-muted text-xs">{t('queue.noteRequired')}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={busy}
              disabled={noteMissing || busy}
              onClick={() => decide.mutate({ id: row.id, decision: 'reject', note: note.trim() })}
            >
              {t('queue.confirmReject')}
            </Button>
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => setRejecting(false)}>
              {t('queue.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            loading={busy}
            disabled={busy}
            onClick={() => decide.mutate({ id: row.id, decision: 'approve' })}
          >
            {t('queue.approve')}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
            {t('queue.reject')}
          </Button>
        </div>
      )}
    </li>
  );
}
