import { useTranslation } from 'react-i18next';
import { can } from '@swams/permissions';
import { useSession } from '../../../hooks/useSession.js';
import { useLeaveRequests } from '../hooks/useLeave.js';
import { BalanceRail } from '../components/BalanceRail.jsx';
import { LeaveForm } from '../components/LeaveForm.jsx';
import { LeaveList } from '../components/LeaveList.jsx';
import { ApprovalQueue } from '../components/ApprovalQueue.jsx';

/**
 * `/leave` — balance, request, history and the reviewer bench (§7.6, screen
 * inventory R1). Everyone sees their own requests; a reviewer lens
 * (`leave.approve`) additionally gets the bench. The permission decides which
 * sections mount — nothing renders empty for a role that cannot act (§8.5).
 */
export function LeavePage() {
  const { t } = useTranslation('leave');
  const { principal } = useSession();
  const canApprove = can(principal, 'leave.approve');

  const mine = useLeaveRequests({ status: 'mine' });
  const pending = useLeaveRequests({ status: 'pending', enabled: canApprove });

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl">{t('title')}</h1>
        <p className="text-text-muted text-sm">{t('subtitle')}</p>
      </header>

      <BalanceRail />

      {can(principal, 'leave.create') ? <LeaveForm /> : null}

      <section className="grid gap-3" aria-labelledby="leave-mine-heading">
        <h2 id="leave-mine-heading" className="text-md">
          {t('list.title')}
        </h2>
        <LeaveList
          rows={mine.rows}
          isLoading={mine.isLoading}
          error={mine.error}
          onRetry={mine.refetch}
        />
      </section>

      {canApprove ? (
        <section className="grid gap-3" aria-labelledby="leave-queue-heading">
          <h2 id="leave-queue-heading" className="text-md">
            {t('queue.title')}
          </h2>
          <ApprovalQueue
            rows={pending.rows}
            isLoading={pending.isLoading}
            error={pending.error}
            onRetry={pending.refetch}
          />
        </section>
      ) : null}
    </div>
  );
}
