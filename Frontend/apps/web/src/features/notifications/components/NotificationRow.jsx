import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@swams/ui';

/** Kind → badge tone. The kind's word is always the badge text (§8.9). */
const KIND_TONE = {
  leave: 'info',
  attendance: 'warning',
  meeting: 'primary',
  call: 'primary',
  system: 'neutral',
};

/**
 * One notification. A row with a link navigates (marking itself read on the
 * way out); a row without one gets an explicit "Mark as read" action, so no
 * control is ever decorative.
 *
 * @param {{ row: object, stamp: (iso: string) => string, onOpen: () => void }} props
 */
export function NotificationRow({ row, stamp, onOpen }) {
  const { t } = useTranslation('notifications');
  const body = t(`item.${row.key}`, row.params ?? {});
  const tone = KIND_TONE[row.kind] ?? 'neutral';

  const content = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        {!row.read ? (
          <>
            <span aria-hidden="true" className="bg-primary h-1.5 w-1.5 shrink-0 rounded-pill" />
            <span className="sr-only">{t('unread')}</span>
          </>
        ) : null}
        <Badge tone={tone}>{t(`kind.${row.kind}`)}</Badge>
      </span>
      <p className={`mt-1 text-sm ${row.read ? 'text-text-muted' : 'text-text font-medium'}`}>
        {body}
      </p>
      <time className="text-text-faint mt-0.5 block text-xs" dateTime={row.createdAt}>
        {stamp(row.createdAt)}
      </time>
    </>
  );

  const className =
    'hover:bg-surface-sunken focus-visible:ring-primary block rounded-input px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2';

  return (
    <li>
      {row.link ? (
        <Link className={className} to={row.link} onClick={onOpen}>
          {content}
        </Link>
      ) : (
        <div className="px-3 py-2.5">
          {content}
          {row.read ? null : (
            <button
              type="button"
              onClick={onOpen}
              className="text-primary hover:bg-surface-sunken focus-visible:ring-primary mt-2 rounded-input px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2"
            >
              {t('markRead')}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
