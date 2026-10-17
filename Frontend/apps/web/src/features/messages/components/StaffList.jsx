import { useTranslation } from 'react-i18next';
import { Avatar, cn } from '@swams/ui';

/** Availability value → status dot. The word beside it carries meaning (§8.9). */
export const STATUS_DOT = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warning',
  do_not_disturb: 'bg-violet',
  offline: 'bg-text-muted/80',
};

/**
 * Dot size per avatar size — ~30% of the avatar, so a dot centred on the
 * bottom-right rim lands exactly on the circle's edge (a 10px dot on a 32px
 * avatar, 14px on a 48px one). Literal classes so Tailwind emits them.
 */
const DOT_SIZE = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

/**
 * The presence dot that rides an avatar's corner. No ring: the white outline
 * that used to hug it read as a stray line around the circle, so the dot is
 * just the coloured circle now. Colour alone never carries the meaning —
 * everywhere this is used the availability word sits beside it (§8.9).
 *
 * The wrapper anchors it at `right-0 bottom-0` (see call sites): for a round
 * avatar that centres a ~30% dot exactly on the 45° rim, so it reads as part
 * of the portrait instead of floating off the corner.
 */
export function StatusDot({ status, size = 'sm', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block rounded-full',
        DOT_SIZE[size] ?? DOT_SIZE.sm,
        STATUS_DOT[status] ?? STATUS_DOT.offline,
        className,
      )}
    />
  );
}

/**
 * Staff avatar strip (§8.4): every team member, with an availability dot and
 * word — online, busy, away, do-not-disturb or offline. Clicking a row opens
 * that person's thread, so anyone in the company can be reached directly. The
 * caller passes `people` already ordered by `sortByAvailability`, so the most
 * reachable people sit at the top (online toward the left).
 *
 * @param {{ people: Array<{id: string, name: string, roleKey?: string, status: string, lastMessage?: string, lastTime?: string, unread?: number}>, activeId: string|null, onOpen: (person: object) => void }} props
 */
export function StaffList({ people, activeId, onOpen }) {
  const { t } = useTranslation('messages');
  const { t: tteam } = useTranslation('team');

  return (
    <ul>
      {people.map((person) => {
        const isActive = activeId === person.id;
        return (
          <li key={person.id}>
            <button
              type="button"
              onClick={() => onOpen(person)}
              aria-current={isActive ? 'true' : undefined}
              aria-label={t('openChat', { name: person.name })}
              className={cn(
                'relative flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors',
                'hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-primary',
                isActive && 'bg-primary-soft',
              )}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="bg-primary absolute inset-y-1 left-0 w-1 rounded-r-full"
                />
              ) : null}

              <span className="relative shrink-0">
                <Avatar name={person.name} size="sm" />
                <span className="absolute right-0 bottom-0">
                  <StatusDot status={person.status} />
                </span>
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{person.name}</span>
                  {person.lastTime ? (
                    <span className="text-text-muted shrink-0 text-[11px] tabular">
                      {person.lastTime}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="text-text-muted min-w-0 flex-1 truncate text-xs">
                    {tteam(`status.${person.status}`)}
                    {person.lastMessage ? ` · ${person.lastMessage}` : ''}
                  </span>
                  {person.unread ? (
                    <span
                      className="bg-danger text-on-primary flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular"
                      aria-label={t('unreadCount', { count: person.unread })}
                    >
                      {person.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
