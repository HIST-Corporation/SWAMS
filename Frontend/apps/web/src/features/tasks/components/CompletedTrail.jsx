import { useTranslation } from 'react-i18next';
import { Badge } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';

/** Priority → badge tone; the word is always the badge text (§8.9). */
const PRIORITY_TONE = { low: 'neutral', normal: 'info', high: 'warning' };

/**
 * Completed History Trail — the board's exit, drawn in the Revision trail's
 * design so the two histories read as one family: every task closed from the
 * Done column, newest first, in a card with an accent heading. Closing never
 * destroys work (§7.6): the row keeps its title, assignee and priority, and
 * its title is a button that opens the same detail panel the board uses — the
 * history is a door, not a graveyard. Empty is a designed state, not a blank
 * table.
 *
 * @param {{ tasks: object[], visible?: boolean, onOpen: (task: object, event: object) => void }} props
 */
export function CompletedTrail({ tasks, visible = true, onOpen }) {
  const { t, i18n } = useTranslation('tasks');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const none = t('trail.none');

  // Nothing to trail until the payload has settled — an empty table during
  // load would claim "nothing closed yet" before the server has answered.
  if (!visible) return null;

  return (
    <section
      aria-labelledby="completed-trail-heading"
      className="border-border bg-surface grid gap-3 rounded-card border p-4"
    >
      <h2
        id="completed-trail-heading"
        className="border-success-text border-l-2 pl-2 text-sm font-semibold uppercase tracking-wide"
      >
        {t('completed.title')}
      </h2>

      {tasks.length === 0 ? (
        <p className="text-text-faint text-sm">{t('completed.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-text-muted border-border border-b text-xs">
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('completed.columns.task')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('completed.columns.assignee')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('completed.columns.priority')}
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  {t('completed.columns.closed')}
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-border border-b last:border-0">
                  <th scope="row" className="px-2 py-2 text-left text-sm font-medium">
                    <button
                      type="button"
                      onClick={(event) => onOpen(task, event)}
                      className="focus-visible:ring-primary rounded-input text-left hover:underline focus-visible:outline-none focus-visible:ring-2"
                    >
                      {task.title}
                    </button>
                  </th>
                  <td className="text-text-muted px-2 py-2">
                    {task.assignee?.name ?? t('unassigned')}
                  </td>
                  <td className="px-2 py-2">
                    <Badge tone={PRIORITY_TONE[task.priority] ?? 'neutral'}>
                      {t(`priority.${task.priority}`)}
                    </Badge>
                  </td>
                  <td className="tabular text-text-muted px-2 py-2">
                    {task.closedAt ? formatDateAd(new Date(task.closedAt), { locale }) : none}
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
