import { useTranslation } from 'react-i18next';
import { ListTodo } from 'lucide-react';
import { Badge, EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';
import { useTodayTasks } from '../hooks/useDashboard.js';

const TONE = { todo: 'neutral', in_progress: 'primary', done: 'success' };

/**
 * Today's tasks (Section 9.9: a list with dividers, not a card grid). Rows are
 * read-only — the task board is R2, so nothing here pretends to toggle status
 * it cannot persist (Section 12.1).
 */
export function TodayTasks({ enabled, bare = false }) {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const tasks = useTodayTasks({ enabled });

  if (!enabled) return null;

  if (tasks.isLoading) {
    return (
      <section aria-busy="true" className="grid gap-3">
        {bare ? null : <Skeleton className="h-5 w-32" />}
        <Skeleton block className="h-11 rounded-card" />
        <Skeleton block className="h-11 rounded-card" />
      </section>
    );
  }

  if (tasks.error) {
    return (
      <ErrorState
        message={tasks.error.message}
        requestId={tasks.error.requestId}
        onRetry={tasks.refetch}
      />
    );
  }

  return (
    <section
      aria-labelledby={bare ? undefined : 'tasks-heading'}
      className={bare ? 'contents' : 'grid gap-3'}
    >
      {bare ? null : (
        <h2 id="tasks-heading" className="text-text font-display text-md">
          {t('tasks.title')}
        </h2>
      )}

      {tasks.rows.length === 0 ? (
        <EmptyState
          icon={<ListTodo aria-hidden="true" size={20} strokeWidth={1.75} />}
          title={t('tasks.emptyTitle')}
          body={t('tasks.emptyBody')}
        />
      ) : (
        <ul className="border-border divide-border divide-y rounded-card border">
          {tasks.rows.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className={`text-sm ${task.status === 'done' ? 'text-text-muted' : ''}`}>
                {task.title}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {task.due ? (
                  <span className="tabular text-text-faint text-xs">
                    {t('tasks.dueOn', {
                      when: formatDateAd(new Date(`${task.due}T12:00:00.000Z`), { locale }),
                    })}
                  </span>
                ) : null}
                <Badge tone={TONE[task.status] ?? 'neutral'}>
                  {t(`tasks.status.${task.status}`)}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
