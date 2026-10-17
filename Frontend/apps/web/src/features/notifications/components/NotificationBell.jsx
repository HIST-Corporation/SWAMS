import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, IconButton, Skeleton } from '@swams/ui';
import { formatDateAd, formatClock, nepalParts } from '@swams/i18n';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks/useNotifications.js';
import { NotificationRow } from './NotificationRow.jsx';
import { BellOff } from 'lucide-react';
import { usePresenceStore } from '../../../stores/presence.js';

/** Nepal-calendar day equality so "Today" never drifts across the UTC+05:45 line (§24). */
function isSameNepalDay(a, b) {
  const pa = nepalParts(a);
  const pb = nepalParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/**
 * NotificationBell — the topbar bell and its panel (§7.10: unread → read).
 *
 * Disclosure pattern: the trigger owns aria-expanded/aria-controls, Escape
 * closes and returns focus, an outside click closes. Marking read is never
 * optimistic — the query refetches once the server answers.
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation('notifications');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const { rows, unread, isLoading, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Do not disturb pauses the bell (§5): a muted bell is never the only signal,
  // so the trigger name and a line in the panel say it in words (§8.9).
  const paused = usePresenceStore((state) => state.status === 'do_not_disturb');

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const stamp = (iso) => {
    const date = new Date(iso);
    const time = formatClock(date);
    return isSameNepalDay(date, new Date())
      ? t('when.today', { time })
      : t('when.on', { date: formatDateAd(date, { locale }), time });
  };

  const openRow = (row) => {
    if (!row.read) markRead.mutate(row.id);
    setOpen(false);
    if (row.link) navigate(row.link);
  };

  const triggerLabel = paused
    ? t('pausedTitle')
    : unread > 0
      ? t('bellWithCount', { count: unread })
      : t('bell');

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        ref={triggerRef}
        className="relative"
        label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? 'notification-panel' : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {paused ? (
          <BellOff aria-hidden="true" size={18} strokeWidth={1.75} />
        ) : (
          <Bell aria-hidden="true" size={18} strokeWidth={1.75} />
        )}
        {!paused && unread > 0 ? (
          <span
            aria-hidden="true"
            className="bg-primary text-on-primary absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-pill px-1 text-[10px] font-semibold leading-none"
          >
            {unread}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <div
          id="notification-panel"
          className="border-border bg-surface-raised shadow-2 absolute right-0 z-toast mt-2 flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-card border"
        >
          <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{t('title')}</h2>
            <button
              type="button"
              disabled={unread === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="text-primary hover:bg-surface-sunken focus-visible:ring-primary rounded-input px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 disabled:opacity-55"
            >
              {t('markAllRead')}
            </button>
          </div>

          {paused ? (
            <p
              role="status"
              className="border-warning bg-warning-soft text-warning-text border-b px-4 py-2 text-xs"
            >
              {t('paused')}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div aria-busy="true" className="grid gap-2 p-1">
                <Skeleton className="h-16 rounded-input" />
                <Skeleton className="h-16 rounded-input" />
              </div>
            ) : error ? (
              <ErrorState
                message={error.message || t('loadError')}
                requestId={error.requestId}
                onRetry={refetch}
              />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Inbox aria-hidden="true" size={20} strokeWidth={1.75} />}
                title={t('emptyTitle')}
                body={t('emptyBody')}
              />
            ) : (
              <ul className="grid gap-1">
                {rows.map((row) => (
                  <NotificationRow
                    key={row.id}
                    row={row}
                    stamp={stamp}
                    onOpen={() => openRow(row)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
