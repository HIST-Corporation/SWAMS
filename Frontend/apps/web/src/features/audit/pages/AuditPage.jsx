import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { formatDateAd, formatClock, nepalParts } from '@swams/i18n';
import { useAuditEntries } from '../hooks/useAudit.js';

/** Nepal-calendar day equality so "Today" never drifts across the UTC+05:45 line (§24). */
function isSameNepalDay(a, b) {
  const pa = nepalParts(a);
  const pb = nepalParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

const ACTION_OPTIONS = [
  'leaveApproved',
  'leaveRejected',
  'correctionApproved',
  'userInvited',
  'roleChanged',
  'userDeactivated',
  'passwordChanged',
  'profileUpdated',
];

/**
 * `/audit` — the org activity log behind `audit.read` (slice 6). Read-only:
 * entries are consequences of actions taken in the sliced features, and the
 * mock states plainly that every row already happened. The server owns
 * pagination and filtering; the page never derives a page of its own.
 */
export function AuditPage() {
  const { t, i18n } = useTranslation('audit');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [page, setPage] = useState(1);

  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const entries = useAuditEntries({ page, perPage: 10, action, actor });

  const stamp = (iso) => {
    const date = new Date(iso);
    const time = formatClock(date);
    return isSameNepalDay(date, new Date())
      ? t('when.today', { time })
      : t('when.on', { date: formatDateAd(date, { locale }), time });
  };

  const applyAction = (option) => {
    setAction(option);
    setPage(1);
  };

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="grid gap-1">
        <h1 className="text-xl">{t('title')}</h1>
        <p className="text-text-muted text-sm">{t('subtitle')}</p>
      </header>

      <form
        aria-label={t('title')}
        className="border-border bg-surface grid gap-3 rounded-card border p-4 md:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('actionFilter')}</span>
          <select
            value={action}
            onChange={(event) => applyAction(event.target.value)}
            className="border-border bg-surface-sunken focus:border-primary rounded-input border px-3 py-2 text-sm outline-none"
          >
            <option value="">{t('allActions')}</option>
            {ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`action.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('actorFilter')}</span>
          <span className="border-border bg-surface-sunken focus-within:border-primary flex items-center gap-2 rounded-input border px-3">
            <Search aria-hidden="true" size={15} strokeWidth={1.75} className="text-text-faint" />
            <input
              type="search"
              value={actor}
              onChange={(event) => {
                setActor(event.target.value);
                setPage(1);
              }}
              placeholder={t('actorPlaceholder')}
              aria-label={t('actorFilter')}
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </span>
        </label>
      </form>

      <section aria-labelledby="audit-list-heading" className="grid gap-3">
        <h2 id="audit-list-heading" className="sr-only">
          {t('subtitle')}
        </h2>

        {entries.isLoading ? (
          <div aria-busy="true" className="grid gap-2">
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
            <Skeleton className="h-20 rounded-card" />
          </div>
        ) : entries.error ? (
          <ErrorState
            message={entries.error.message || t('loadError')}
            requestId={entries.error.requestId}
            onRetry={entries.refetch}
          />
        ) : entries.rows.length === 0 ? (
          <EmptyState
            icon={<ScrollText aria-hidden="true" size={20} strokeWidth={1.75} />}
            title={t('emptyTitle')}
            body={t('emptyBody')}
          />
        ) : (
          <>
            <ul className="border-border divide-y divide-border rounded-card border">
              {entries.rows.map((row) => (
                <li key={row.id} className="grid gap-1 px-5 py-3.5">
                  <p className="text-sm">
                    <span className="font-medium">{row.actor}</span>{' '}
                    <span className="text-text-muted">{t(`action.${row.action}`)}</span>
                  </p>
                  <p className="text-text-faint text-xs">
                    {t(`entity.${row.entity}`)}
                    {' · '}
                    <time dateTime={row.createdAt}>{stamp(row.createdAt)}</time>
                  </p>
                </li>
              ))}
            </ul>

            <nav
              aria-label={t('title')}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-text-faint text-xs">
                {t('showing', {
                  from: (entries.page - 1) * 10 + 1,
                  to: Math.min(entries.page * 10, entries.total),
                  total: entries.total,
                })}
                {' · '}
                {t('pageOf', { page: entries.page, pages: entries.totalPages })}
              </p>
              <p className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={entries.page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  {t('prev')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={entries.page >= entries.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('next')}
                </Button>
              </p>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
