import { useTranslation } from 'react-i18next';
import { Badge } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';

/** Severity → badge tone; the word is always the badge text (§8.9). */
const SEVERITY_TONE = { major: 'danger', minor: 'warning' };

/**
 * Revision History Trail — the prototype's table under the board: every push
 * back in one place, newest first, so "why did this go backwards?" never
 * depends on reading one card's note. Empty is a designed state, not a blank
 * table.
 *
 * @param {{ revisions: object[], visible?: boolean }} props
 */
export function RevisionTrail({ revisions, visible = true }) {
  const { t, i18n } = useTranslation('tasks');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const none = t('trail.none');

  // Nothing to trail until the payload has settled — an empty table during
  // load would claim "no revisions yet" before the server has answered.
  if (!visible) return null;

  return (
    <section
      aria-labelledby="revision-trail-heading"
      className="border-border bg-surface grid gap-3 rounded-card border p-4"
    >
      <h2
        id="revision-trail-heading"
        className="border-violet-text border-l-2 pl-2 text-sm font-semibold uppercase tracking-wide"
      >
        {t('trail.title')}
      </h2>

      {revisions.length === 0 ? (
        <p className="text-text-faint text-sm">{t('trail.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-text-muted border-border border-b text-xs">
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('trail.columns.task')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('trail.columns.issue')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('trail.columns.suggestion')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('trail.columns.severity')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('trail.columns.reviewer')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('trail.columns.date')}
                </th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((row) => (
                <tr key={row.id} className="border-border border-b last:border-0">
                  <th scope="row" className="px-2 py-2 text-left text-sm font-medium">
                    {row.taskTitle}
                  </th>
                  <td className="px-2 py-2">{row.issue || none}</td>
                  <td className="text-text-muted px-2 py-2">{row.suggestion || none}</td>
                  <td className="px-2 py-2">
                    <Badge tone={SEVERITY_TONE[row.severity] ?? 'neutral'}>
                      {t(`severityShort.${row.severity}`)}
                    </Badge>
                  </td>
                  <td className="px-2 py-2">{row.reviewer}</td>
                  <td className="tabular text-text-muted px-2 py-2">
                    {formatDateAd(new Date(`${row.date}T12:00:00.000Z`), { locale })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
