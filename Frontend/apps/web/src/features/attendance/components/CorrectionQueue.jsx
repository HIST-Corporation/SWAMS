import { ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { CorrectionQueueRow } from './CorrectionQueueRow.jsx';

/**
 * Reviewer's correction queue (§7.5). Each row runs its own review machine, so
 * two decisions can be in flight without one blocking the other. Copy for the
 * bench lives under `team.*` — it is the manager lens, not the requester's.
 *
 * @param {{ rows: object[], isLoading?: boolean, error?: object, onRetry?: () => void }} props
 */
export function CorrectionQueue({ rows, isLoading = false, error, onRetry }) {
  const { t } = useTranslation('attendance');

  if (isLoading) {
    return (
      <div className="grid gap-2" aria-busy="true">
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
        icon={<ClipboardCheck aria-hidden="true" size={20} strokeWidth={1.75} />}
        title={t('team.queueEmpty')}
      />
    );
  }

  return (
    <ul aria-label={t('team.queue')} className="grid gap-3">
      {rows.map((row) => (
        <CorrectionQueueRow key={row.id} row={row} />
      ))}
    </ul>
  );
}
