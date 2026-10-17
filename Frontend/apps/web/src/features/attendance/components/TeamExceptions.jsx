import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

/**
 * "Needs attention" — the team-board rows the server flagged with an
 * exception (slice 4). Plain words, never colour alone (§8.9); the bench that
 * resolves them is one link away at the correction queue.
 * @param {{ rows: object[] }} props rows already filtered to `row.exception`
 */
export function TeamExceptions({ rows }) {
  const { t } = useTranslation('attendance');
  return (
    <section aria-labelledby="team-exceptions-heading" className="grid gap-3">
      <h2 id="team-exceptions-heading" className="text-md">
        {t('team.exceptions')}
      </h2>

      {rows.length === 0 ? (
        <p className="text-text-muted text-sm">{t('team.noExceptions')}</p>
      ) : (
        <>
          <ul
            aria-label={t('team.exceptions')}
            className="bg-surface border-border divide-y divide-border rounded-card border"
          >
            {rows.map((row) => (
              <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.75}
                  className="text-warning-text mt-0.5 shrink-0"
                />
                <div className="grid min-w-0 gap-0.5">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="text-warning-text text-sm">{t(`exception.${row.exception}`)}</p>
                  <p className="text-text-faint text-xs">
                    {row.site}
                    {row.clockIn ? ` · ${row.clockIn}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            className="text-primary justify-self-start text-sm font-medium underline"
            to="/attendance/corrections"
          >
            {t('team.openQueue')}
          </Link>
        </>
      )}
    </section>
  );
}
