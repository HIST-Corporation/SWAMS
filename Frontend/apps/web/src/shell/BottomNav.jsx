import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ICONS } from './nav-icons.js';

/** Nav labels live in the nav namespace: packages/i18n, locales/{en,ne}/nav.json. */
const useNavT = () => useTranslation('nav').t;

/**
 * The mobile rail is the same surface as the desktop sidebar, so the nav reads
 * as one thing across widths. The current tab is brand blue *and* heavier —
 * 8.9: colour never carries the state alone.
 */
const IDLE = 'flex flex-1 flex-col items-center gap-1 py-2 text-nav-label';
const ACTIVE = 'flex flex-1 flex-col items-center gap-1 py-2 font-semibold text-primary';

/**
 * Bottom tabs (Section 8.4): Home, Attendance, Work, Leave, More — permission-
 * and release-filtered by the same nav config as the sidebar. They carry the
 * nav all the way to 1023px: the sidebar takes over at `lg`, because at 768 a
 * 240px rail would leave the content column at 464px.
 * @param {{ items: Array<object> }} props
 */
export function BottomNav({ items }) {
  const t = useNavT();

  return (
    <nav
      className="bg-nav-bg border-nav-border fixed inset-x-0 bottom-0 z-sticky flex border-t lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary mobile"
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => (isActive ? ACTIVE : IDLE)}
          >
            {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={1.75} /> : null}
            <span className="text-xs">{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
