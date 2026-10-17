import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleCheck, History, Users, Waves } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton, StatTile } from '@swams/ui';
import { useTeamAttendance } from '../hooks/useAttendance.js';
import { TeamBoardRow } from '../components/TeamBoardRow.jsx';
import { TeamExceptions } from '../components/TeamExceptions.jsx';

/** Summary keys in tile order, with the tint and icon each tile speaks in too. */
const SUMMARY = [
  { key: 'present', tone: 'success' },
  { key: 'late', tone: 'warning' },
  { key: 'onLeave', tone: 'accent' },
  { key: 'notIn', tone: 'plain' },
];

/** Tile icons in SUMMARY order — decorative, the labels carry the meaning. */
const SUMMARY_ICONS = [CircleCheck, History, Users, Waves];

/**
 * `/attendance/team` — the manager/HR attendance board (slice 4). One query
 * owns presence, exceptions and the summary (§8.6) so the three can never
 * disagree on screen; every number rendered is the server's, never recomputed.
 */
export function TeamBoardPage() {
  const { t } = useTranslation('attendance');
  const team = useTeamAttendance();
  const summary = team.summary ?? {};
  const exceptions = team.rows.filter((row) => row.exception);

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl">{t('team.title')}</h1>
        <nav className="flex flex-wrap items-baseline gap-3 text-sm font-medium">
          <Link className="text-primary underline" to="/attendance">
            {t('today')}
          </Link>
          <Link className="text-primary underline" to="/attendance/history">
            {t('history')}
          </Link>
        </nav>
      </header>

      {team.isLoading ? (
        <div aria-busy="true" className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} block className="h-24 rounded-card" />
            ))}
          </div>
          <div className="grid gap-2">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="rounded-card h-16" />
            ))}
          </div>
        </div>
      ) : null}

      {!team.isLoading && team.error ? (
        <ErrorState
          message={team.error.message}
          requestId={team.error.requestId}
          onRetry={team.refetch}
        />
      ) : null}

      {!team.isLoading && !team.error && team.rows.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden="true" size={20} strokeWidth={1.75} />}
          title={t('team.title')}
          body={t('team.boardEmpty')}
        />
      ) : null}

      {!team.isLoading && !team.error && team.rows.length > 0 ? (
        <>
          <div
            role="group"
            aria-label={t('team.title')}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {SUMMARY.map(({ key, tone }, index) => {
              const Icon = SUMMARY_ICONS[index];
              return (
                <StatTile
                  key={key}
                  tone={tone}
                  icon={Icon ? <Icon aria-hidden="true" size={18} strokeWidth={1.75} /> : null}
                  label={t(`team.${key}`)}
                  value={String(summary[key] ?? 0)}
                />
              );
            })}
          </div>

          <p className="text-text-muted text-sm">
            {t('team.summary', {
              present: summary.present ?? 0,
              expected: summary.expected ?? 0,
            })}
          </p>

          <section aria-labelledby="team-board-heading" className="grid gap-3">
            <h2 id="team-board-heading" className="text-md">
              {t('team.board')}
            </h2>
            <ul
              aria-label={t('team.board')}
              className="bg-surface border-border divide-y divide-border rounded-card border"
            >
              {team.rows.map((row) => (
                <TeamBoardRow key={row.id} row={row} />
              ))}
            </ul>
          </section>

          <TeamExceptions rows={exceptions} />
        </>
      ) : null}
    </div>
  );
}
