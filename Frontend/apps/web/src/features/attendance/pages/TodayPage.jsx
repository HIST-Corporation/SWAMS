import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { can } from '@swams/permissions';
import { useSession } from '../../../hooks/useSession.js';
import { PunchCard } from '../components/PunchCard.jsx';
import { WeekStrip } from '../components/WeekStrip.jsx';
import { MonthCalendar } from '../components/MonthCalendar.jsx';

/**
 * `/attendance` — today. Thin page: the punch card owns the workflow (§7.1),
 * the week strip states how the week is going (§9.9) and the month calendar
 * shows the month's present / absent / late / leave at a glance; the page
 * only adds the title and the routes onward (history, corrections, and — for
 * reviewers — the team board).
 */
export function TodayPage() {
  const { t } = useTranslation('attendance');
  const { principal } = useSession();
  const canReview = can(principal, 'attendance.approve');

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl">{t('title')}</h1>
        <nav className="flex flex-wrap items-baseline gap-3 text-sm font-medium">
          {canReview ? (
            <Link className="text-primary underline" to="/attendance/team">
              {t('team.title')}
            </Link>
          ) : null}
          <Link className="text-primary underline" to="/attendance/history">
            {t('history')}
          </Link>
          <Link className="text-primary underline" to="/attendance/corrections">
            {t('corrections.open')}
          </Link>
        </nav>
      </header>

      <PunchCard />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <WeekStrip />
        <MonthCalendar />
      </div>
    </div>
  );
}
