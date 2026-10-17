import { Fingerprint, Lock } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@swams/ui';
import { usePresenceStore } from '../stores/presence.js';
import { StatusMessageLine } from './StatusMessageLine.jsx';
import { ICONS } from './nav-icons.js';

/** Nav labels live in the nav namespace: packages/i18n, locales/{en,ne}/nav.json. */
const useNavT = () => useTranslation('nav').t;

/**
 * The rail mirrors the prototype's `.sidebar` (SWAMS_Unified.html): a
 * logo block, a user card, labelled nav sections, and a footer action. It is
 * built from the `nav-*` tokens — white in light, `--bg2` in dark, exactly as
 * the prototype's `--bg2` rail — so it flips with the theme.
 *
 * The current page wears a solid brand pill **and** heavier weight — 8.9:
 * colour never carries state alone.
 *
 * The rail appears at `lg`, not `md`: at 768 the 240px rail plus 64px of page
 * padding left a 464px content column — phone-width content beside desktop
 * chrome. Tablets keep the bottom rail (BottomNav) and the full width, and the
 * three-width rule (360 / 768 / 1280) is what it should be at each size.
 */
const ACTIVE =
  'flex items-center gap-2.5 rounded-input bg-nav-active px-2.5 py-2 text-[13px] font-semibold text-nav-active-fg';
const IDLE =
  'flex items-center gap-2.5 rounded-input px-2.5 py-2 text-[13px] font-medium text-nav-text transition-colors duration-feedback hover:bg-surface-sunken hover:text-nav-text-strong';
/** Locked items stay legible (no opacity dimming that would break 4.5:1). */
const LOCKED =
  'flex items-center gap-2.5 rounded-input px-2.5 py-2 text-[13px] font-medium text-nav-label';

/**
 * Desktop sidebar (Section 8.4): grouped nav, permission + entitlement aware.
 * Locked items show an upgrade affordance with a reason — never a dead link.
 *
 * `role` comes from the session's `principal` — the authoritative source —
 * because the user object carries no role of its own. Reading it off `user`
 * used to label every signed-in person "Staff", the HR demo account included.
 *
 * @param {{ groups: Array<{ id: string, labelKey: string, items: Array<object> }>, user: object|null, org: object|null, role?: string }} props
 */
export function Sidebar({ groups, user, org, role }) {
  const t = useNavT();
  const presence = usePresenceStore((state) => state.status);

  return (
    <aside className="bg-nav-bg border-nav-border sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
      <div className="border-nav-border border-b px-5 py-4">
        <div className="font-display text-text text-xl font-extrabold tracking-tight">
          SWA<span className="text-primary">MS</span>
        </div>
        <div className="text-nav-label mt-0.5 truncate text-[10px] tracking-widest uppercase">
          {org?.name ?? ''}
        </div>
      </div>

      {user ? (
        <div className="border-nav-border flex items-center gap-2.5 border-b px-5 py-3.5">
          <Avatar name={user.name} size="md" status={presence} statusRing="ring-nav-bg" />
          <div className="min-w-0 flex-1">
            <div className="text-nav-text-strong truncate text-[13px] font-medium">{user.name}</div>
            <div className="text-nav-label truncate text-[11px]">
              {/* The job title the session carries (`nav.job.*`) is more
                  specific than the permission role — "HR Manager", "Frontend
                  Developer" — and falls back to the role word for a session
                  that has no title. */}
              {user.jobKey ? t(`nav.job.${user.jobKey}`) : t(`nav.role.${role ?? 'staff'}`)}
            </div>
            {/* Your editable status line — empty until set, e.g. "managing well". */}
            <StatusMessageLine />
          </div>
        </div>
      ) : null}

      <nav aria-label={t('nav.primary')} className="flex-1 overflow-y-auto px-2.5 py-3">
        {groups.map((group) => (
          <div key={group.id} className="mb-3">
            <div className="text-nav-label px-2.5 pt-2 pb-2 text-[10px] font-semibold tracking-[1.5px] uppercase">
              {t(group.labelKey)}
            </div>
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const label = t(item.labelKey);
                if (item.access === 'locked') {
                  return (
                    <li key={item.id}>
                      <span className={LOCKED} aria-disabled="true" title={t('nav.upgradeHint')}>
                        <Lock aria-hidden="true" size={15} strokeWidth={1.75} />
                        {label}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) => (isActive ? ACTIVE : IDLE)}
                    >
                      {Icon ? <Icon aria-hidden="true" size={15} strokeWidth={1.75} /> : null}
                      <span className="truncate">{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* The prototype's `.sidebar-footer`. One tap to the punch action — a
          real route, not a button that pretends to punch. */}
      <div className="border-nav-border border-t px-4 py-3.5">
        <Link
          to="/attendance"
          className="border-danger/25 bg-danger-soft/60 text-danger-text hover:bg-danger-soft flex w-full items-center justify-center gap-2 rounded-input border px-3 py-2 text-[13px] font-medium transition-colors duration-feedback"
        >
          <Fingerprint aria-hidden="true" size={15} strokeWidth={1.75} />
          {t('nav.footer.clock')}
        </Link>
      </div>
    </aside>
  );
}
