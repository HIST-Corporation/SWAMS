import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Card, Badge, ErrorState, Skeleton } from '@swams/ui';
import { can } from '@swams/permissions';
import { useSession } from '../../../hooks/useSession.js';
import { useCorrections } from '../../attendance/index.js';

/**
 * "Needs you" — the one section on Home with a count (Section 9.9). Only shows
 * items the worker can actually act on, and every row navigates to the screen
 * that acts on it (`/attendance/corrections`) — no decorative rows. Reviewers
 * additionally see the bench; the query does not fire without the permission.
 */
export function NeedsYou() {
  const { t } = useTranslation('dashboard');
  const { principal } = useSession();
  const canReview = can(principal, 'attendance.approve');

  const mine = useCorrections({ status: 'mine' });
  const pending = useCorrections({ status: 'pending', enabled: canReview });

  if (mine.isLoading || pending.isLoading) {
    return (
      <section aria-busy="true" className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton block className="h-12 rounded-card" />
        <Skeleton block className="h-12 rounded-card" />
      </section>
    );
  }

  if (mine.error) {
    return (
      <ErrorState
        message={mine.error.message}
        requestId={mine.error.requestId}
        onRetry={mine.refetch}
      />
    );
  }

  const needsInfo = mine.rows.filter((row) => row.status === 'needs_info').length;
  const waiting = canReview ? pending.rows.length : 0;
  const count = needsInfo + waiting;

  const items = [];
  if (needsInfo > 0) {
    items.push({ key: 'needs-info', label: t('needs.needsInfo', { count: needsInfo }) });
  }
  if (waiting > 0) {
    items.push({ key: 'queue', label: t('needs.corrections', { count: waiting }) });
  }

  return (
    <Card className="rounded-card border border-border bg-surface-raised">
      <div className="border-b border-border px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="needs-you-heading"
            className="text-sm font-semibold text-text"
          >
            {count > 0 ? t('needs.countTitle', { count }) : t('needs.title')}
          </h2>
          {count > 0 ? <Badge tone="danger">{count}</Badge> : null}
        </div>
      </div>

      {count === 0 ? (
        <div className="border-border px-5 py-6 text-sm text-text-muted">
          <p className="text-text">{t('needs.emptyTitle')}</p>
          <p className="mt-1 text-text-faint">{t('needs.emptyBody')}</p>
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-sunken focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-offset-1"
                to="/attendance/corrections"
              >
                <span className="text-sm text-text">{item.label}</span>
                <ChevronRight
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.75}
                  className="text-text-faint"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
