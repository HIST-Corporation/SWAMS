import { ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, ErrorState, Skeleton } from '@swams/ui';

/** Status → badge tone; the label always accompanies the colour (§8.9). */
const TONE = {
  in_review: 'info',
  approved: 'success',
  rejected: 'danger',
  needs_info: 'warning',
};

/**
 * The requester's own correction records (§7.5). Shows the original punch beside
 * the proposal so nobody has to remember what they asked for.
 * @param {{ rows: object[], isLoading?: boolean, error?: object, onRetry?: () => void }} props
 */
export function CorrectionList({ rows, isLoading = false, error, onRetry }) {
  const { t } = useTranslation('attendance');

  if (isLoading) {
    return (
      <div className="grid gap-2" aria-busy="true">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="rounded-card h-24" />
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
        icon={<ClipboardList aria-hidden="true" size={20} strokeWidth={1.75} />}
        title={t('corrections.empty')}
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.id} className="bg-surface border-border rounded-card border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <time dateTime={row.date} className="tabular text-sm font-medium">
              {row.date}
            </time>
            <Badge tone={TONE[row.status] ?? 'neutral'}>
              {t(`corrections.status.${row.status}`, { defaultValue: row.status })}
            </Badge>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Pair label={t('corrections.original')} value={formatPunch(row.original)} muted />
            <Pair label={t('corrections.proposed')} value={formatPunch(row.proposed)} />
          </dl>

          {row.reason ? <p className="text-text-muted mt-3 text-sm">{row.reason}</p> : null}
          {row.note ? (
            <div className="mt-2 text-sm">
              <p className="text-text-faint text-xs">{t('corrections.reviewerNote')}</p>
              <p className="text-warning-text">{row.note}</p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** "09:02 → 17:18", or a dash when the punch was missing. */
function formatPunch(punch) {
  if (!punch) return '—';
  const inTime = punch.clockIn ?? '—';
  const outTime = punch.clockOut ?? '—';
  return `${inTime} → ${outTime}`;
}

function Pair({ label, value, muted = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-text-faint text-xs">{label}</dt>
      <dd className={muted ? 'tabular text-text-muted' : 'tabular'}>{value}</dd>
    </div>
  );
}
