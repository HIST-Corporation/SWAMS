import { useTranslation } from 'react-i18next';
import { Avatar, cn } from '@swams/ui';
import { StatusDot } from './StaffList.jsx';
import { sortByAvailability } from '../mocks/fixtures.js';

/**
 * The first name only — the rail is a quick-reach strip, so a first name keeps
 * each tile narrow enough to fit a dozen across one scrollable row. The full
 * name still rides the button's accessible label (§9.7: the name is adjacent,
 * and here it is the tile's own `aria-label`, never colour alone).
 * @param {string} name
 */
function firstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] ?? '';
}

/**
 * Team rail (§8.4) — a Messenger-style horizontal strip of EVERY colleague,
 * sitting above the message list. Online people float to the left (the caller
 * passes `people` already ordered by `sortByAvailability`), each a circular
 * avatar with a presence dot centred on its rim and a first name beneath.
 * Clicking a face opens that person's thread — including someone with no
 * conversation yet, which opens an honest empty thread rather than a dead
 * control. It scrolls horizontally when the roster outgrows the row; the
 * scrollbar is hidden so the strip reads as one continuous band.
 *
 * A distinct accessible label ("Message {{name}}") keeps it from colliding
 * with the DM list's own "Chat with {{name}}" rows for the same person.
 *
 * @param {{ people: Array<{id: string, name: string, status: string}>, activeId: string|null, onOpen: (person: object) => void }} props
 */
export function TeamRail({ people, activeId, onOpen }) {
  const { t } = useTranslation('messages');

  const ordered = sortByAvailability(people);
  const onlineCount = ordered.filter((person) => person.status === 'online').length;

  return (
    <section
      aria-label={`${t('teamRailLabel')} — ${t('onlineCount', { count: onlineCount })}`}
      className="border-border bg-surface-raised rounded-card border px-3 py-1"
    >
      {/* Single compact row — no separate label/count header, so the strip stays
          short and gives the thread its height back. The "TEAM · N online"
          context still reaches assistive tech via the section's aria-label. */}
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ordered.map((person) => {
          const isActive = activeId === person.id;
          return (
            <li key={person.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onOpen(person)}
                aria-label={t('quickChat', { name: person.name })}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'focus-visible:ring-primary group flex w-14 flex-col items-center gap-0.5 rounded-input px-1 py-0.5 outline-none transition-colors focus-visible:ring-2',
                  isActive ? 'bg-primary-soft' : 'hover:bg-surface-sunken',
                )}
              >
                <span className="relative">
                  <Avatar name={person.name} size="md" />
                  <span className="absolute right-0 bottom-0">
                    <StatusDot status={person.status} size="md" />
                  </span>
                </span>
                <span
                  className={cn(
                    'max-w-full truncate text-[11px]',
                    isActive ? 'text-text font-semibold' : 'text-text-muted font-medium',
                  )}
                >
                  {firstName(person.name)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
