import { useTranslation } from 'react-i18next';
import { ErrorState, Skeleton, StatTile } from '@swams/ui';
import { useLeaveBalance } from '../hooks/useLeave.js';

/**
 * Balance rail (§7.6). The server computes entitlements, so every number here
 * is whatever the API stated — the UI never derives remaining days itself.
 * One tinted tile per leave type so a person sees the whole pot at a glance.
 */
export function BalanceRail() {
  const { t } = useTranslation('leave');
  const balance = useLeaveBalance();

  if (balance.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
        <Skeleton block className="h-24 rounded-card" />
        <Skeleton block className="h-24 rounded-card" />
      </div>
    );
  }

  if (balance.error) {
    return (
      <ErrorState
        message={balance.error.message}
        requestId={balance.error.requestId}
        onRetry={balance.refetch}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {balance.rows.map((row) => (
        <StatTile
          key={row.type}
          tone={row.type === 'annual' ? 'primary' : 'accent'}
          label={t(`types.${row.type}`)}
          value={t('days', { count: row.remaining })}
          hint={t('balanceHint', { used: row.used, pending: row.pending })}
        />
      ))}
    </div>
  );
}
