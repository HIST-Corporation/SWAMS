import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Card, CardTitle, EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { usePresence } from '../hooks/useDashboard.js';
import { StatusPicker } from './StatusPicker.jsx';

/** Presence → badge tone; the word beside the avatar carries the meaning (8.9). */
const TONE = { in: 'success', late: 'warning', leave: 'info', out: 'neutral' };

/** Availability id → status dot. `team.status.*` says the word beside it. */
const DOT = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warning',
  offline: 'bg-text-muted/60',
};

/**
 * TeamNow — the Home avatar strip from the staff home plan (§9.9, "Team now"):
 * who is in the office right now, across the whole roster, so a demo team reads
 * like an office instead of three avatars.
 *
 * It reads `GET /presence`, whose rows are the shared roster in another shape —
 * the same ids, names and initials the team board and the directory print, so
 * two widgets on one screen can never disagree about who exists (Section 7.6).
 *
 * States: loading (chips skeleton), error (request ID + retry), empty ("nobody
 * clocked in"). The list wraps at every width instead of scrolling sideways,
 * because a strip that hides colleagues is no better than no strip.
 */
export function TeamNow() {
  const { t } = useTranslation('dashboard');
  const { t: tteam } = useTranslation('team');
  const { isLoading, error, refetch, rows } = usePresence();

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="team-now-heading">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} block className="h-12 rounded-input" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  // `in` and `late` both mean the person is at work today (contract request 13).
  const atWork = rows.filter((row) => row.presence === 'in' || row.presence === 'late').length;

  return (
    <Card aria-labelledby="team-now-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle id="team-now-heading" className="mb-0">
          {t('teamNow.title')}
        </CardTitle>
        {rows.length > 0 ? (
          <p className="tabular text-text-muted text-xs">
            {t('teamNow.summary', { present: atWork, total: rows.length })}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <StatusPicker />
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('teamNow.emptyTitle')} body={t('teamNow.empty')} />
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((person) => (
            <li
              key={person.id}
              className="bg-surface-sunken flex items-center gap-2.5 rounded-input px-3 py-2"
            >
              <Avatar name={person.name} size="sm" src={`/avatars/${person.id}.svg`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{person.name}</span>
                <span className="block truncate text-[11px]">
                  <span className="text-text-faint">{person.site}</span>
                  {person.online ? (
                    <>
                      {' · '}
                      <span className="inline-flex items-center gap-1">
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-pill ${
                            DOT[person.online] ?? DOT.offline
                          }`}
                        />
                        <span className="text-text-muted">{tteam(`status.${person.online}`)}</span>
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
              <Badge tone={TONE[person.presence] ?? 'neutral'}>
                {t(`presence.${person.presence}`)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
