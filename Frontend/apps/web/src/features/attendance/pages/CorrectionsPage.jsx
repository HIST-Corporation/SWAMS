import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { can } from '@swams/permissions';
import { useSession } from '../../../hooks/useSession.js';
import { useCorrections } from '../hooks/useAttendance.js';
import { CorrectionForm } from '../components/CorrectionForm.jsx';
import { CorrectionList } from '../components/CorrectionList.jsx';
import { CorrectionQueue } from '../components/CorrectionQueue.jsx';

/**
 * `/attendance/corrections` — both sides of §7.5 in one place: everyone sees
 * their own requests, and a reviewer lens (`attendance.approve`) additionally
 * gets the bench. The permission decides which sections mount; nothing renders
 * empty for a role that cannot act (§8.5).
 */
export function CorrectionsPage() {
  const { t } = useTranslation('attendance');
  const { principal } = useSession();
  const canReview = can(principal, 'attendance.approve');

  const mine = useCorrections({ status: 'mine' });
  const pending = useCorrections({ status: 'pending', enabled: canReview });

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl">{t('corrections.title')}</h1>
        <Link className="text-primary text-sm font-medium underline" to="/attendance">
          {t('today')}
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <CorrectionForm />

        <section className="grid gap-3" aria-labelledby="corrections-mine-heading">
          <h2 id="corrections-mine-heading" className="text-md">
            {t('corrections.mine')}
          </h2>
          <CorrectionList
            rows={mine.rows}
            isLoading={mine.isLoading}
            error={mine.error}
            onRetry={mine.refetch}
          />
        </section>
      </div>

      {canReview ? (
        <section className="grid gap-3">
          <h2 className="text-md">{t('team.queue')}</h2>
          <CorrectionQueue
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
