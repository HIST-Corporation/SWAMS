import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession.js';

/** Nav labels live in the nav namespace: packages/i18n, locales/{en,ne}/nav.json. */
const useNavT = () => useTranslation('nav').t;
import { visibleGroups } from '../../app/nav-access.js';
import { NAV_ITEMS } from '../../app/nav.config.js';
import { ICONS } from '../nav-icons.js';

/**
 * Mobile "More" destination (Section 8.4): every visible section, grouped,
 * with the same permission/entitlement states as the desktop sidebar.
 */
export function MorePage() {
  const t = useNavT();
  const { principal, entitlements } = useSession();
  const groups = visibleGroups(NAV_ITEMS, principal, entitlements).filter(
    (group) => group.items.length > 0,
  );

  return (
    <div className="mx-auto max-w-reading">
      <h1 className="text-xl">{t('nav.more')}</h1>

      {groups.map((group) => (
        <section key={group.id} className="mt-6">
          <h2 className="text-text-faint text-xs font-semibold">{t(group.labelKey)}</h2>
          <ul className="bg-surface border-border mt-2 divide-y divide-border rounded-card border">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const label = t(item.labelKey);
              const content = (
                <>
                  {Icon ? <Icon aria-hidden="true" size={16} strokeWidth={1.75} /> : null}
                  <span className="flex-1">{label}</span>
                  {item.access === 'locked' ? (
                    <Lock aria-label={t('nav.upgradeHint')} aria-hidden="true" size={14} />
                  ) : null}
                </>
              );
              const className = 'flex min-h-11 items-center gap-3 px-4 py-3 text-sm';
              return (
                <li key={item.id}>
                  {item.access === 'locked' ? (
                    <span className={`${className} text-text-faint`} aria-disabled="true">
                      {content}
                    </span>
                  ) : (
                    <Link className={`${className} text-text`} to={item.path}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
