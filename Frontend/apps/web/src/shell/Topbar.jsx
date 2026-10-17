import { Languages, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton, ThemeToggle } from '@swams/ui';
import { useUiStore } from '../stores/ui.js';
import { NotificationBell } from '../features/notifications/index.js';
import { UserMenu } from './UserMenu.jsx';

/**
 * Topbar (Section 8.4): language, theme, notifications, avatar.
 *
 * The prototype has no floating chrome band — `.main` scrolls and each `.page`
 * opens with its own `.page-header`. So this bar is a transparent utility
 * strip: it holds the account controls on the right and otherwise stays out of
 * the way, and every page renders its own PageHeader underneath.
 *
 * Command palette, org switcher and the BS/AD toggle arrive with their features
 * (see apps/web/README.md) — no placeholder buttons that do nothing.
 */
export function Topbar({ user, org }) {
  const { t, i18n } = useTranslation();
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);

  const toggleLanguage = () => {
    const next = i18n.language === 'ne' ? 'en' : 'ne';
    i18n.changeLanguage(next);
    try {
      window.localStorage.setItem('swams.language', next);
    } catch {
      /* private mode: in-memory only */
    }
  };

  return (
    <header className="sticky top-0 z-sticky bg-bg/90 px-4 pt-3 backdrop-blur md:px-8">
      <div className="mx-auto flex h-10 w-full max-w-[1280px] items-center justify-end gap-1">
        <IconButton label={t('palette.open')} onClick={() => setPaletteOpen(true)}>
          <Search aria-hidden="true" size={18} strokeWidth={1.75} />
        </IconButton>

        <IconButton
          label={t('language.switch')}
          onClick={toggleLanguage}
          aria-pressed={i18n.language === 'ne'}
        >
          <Languages aria-hidden="true" size={18} strokeWidth={1.75} />
        </IconButton>

        <ThemeToggle />

        <NotificationBell />

        <UserMenu user={user} org={org} />
      </div>
    </header>
  );
}
