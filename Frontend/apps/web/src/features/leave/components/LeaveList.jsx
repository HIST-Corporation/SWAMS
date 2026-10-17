import { CalendarOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { formatRange } from '../utils/formatRange.js';

/** Status → badge tone; the label always accompanies the colour (§8.9). */
const TONE = { pending: 'info', approved: 'success', rejected: 'danger', cancelled: 'neutral' };

/**
 * The signed-in person's own leave requests (§7.6). Each row states the type,
 * the date range, the day count and whatever the server decided — no status is
 * assumed before the API says it.
 * @param {{ rows: object[], isLoading?: boolean, error?: object, onRetry?: () => void }} props
 */
export function LeaveList({ rows, isLoading = false, error, onRetry }) {
  const { t, i18n } = useTranslation('leave');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';

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
        icon={<CalendarOff aria-hidden="true" size={20} strokeWidth={1.75} />}
        title={t('list.emptyTitle')}
        body={t('list.emptyBody')}
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.id} className="bg-surface border-border rounded-card border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{t(`types.${row.type}`)}</span>
            <Badge tone={TONE[row.status] ?? 'neutral'}>
              {t(`status.${row.status}`, { defaultValue: row.status })}
            </Badge>
          </div>

          <p className="tabular text-text-muted mt-2 text-sm">
            {t('list.meta', {
              range: formatRange(row.start, row.end, locale),
              days: t('days', { count: row.days }),
            })}
          </p>

          {row.note ? <p className="text-text-muted mt-2 text-sm">{row.note}</p> : null}

          {row.status === 'rejected' && row.note ? (
            <p className="text-warning-text mt-2 text-sm">{row.note}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
