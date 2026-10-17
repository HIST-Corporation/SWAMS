import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, HeartPulse, LayoutGrid, LogOut, ShieldCheck, Users } from 'lucide-react';
import { IconButton, ThemeToggle } from '@swams/ui';
import { PLATFORM_SUMMARY } from './data/fixtures.js';
import { AccountsSection } from './sections/AccountsSection.jsx';
import { HealthSection } from './sections/HealthSection.jsx';
import { FixtureNotice, OverviewSection } from './sections/OverviewSection.jsx';
import { OrganizationsSection } from './sections/OrganizationsSection.jsx';

/** The console's four sections; id doubles as the nav key (`console.nav.*`). */
const SECTIONS = [
  { id: 'overview', Icon: LayoutGrid },
  { id: 'organizations', Icon: Building2 },
  { id: 'accounts', Icon: Users },
  { id: 'health', Icon: HeartPulse },
];

/**
 * The platform console shell — a sidebar of platform sections, its own topbar
 * (language, theme, sign out) and a labelled-fixture banner over the content.
 * Deliberately NOT the workforce app shell: platform administration is a
 * separate application and auth realm (Section: three applications).
 *
 * @param {{ session: { name: string, email: string }, onSignOut: () => void }} props
 */
export function ConsoleApp({ session, onSignOut }) {
  const { t, i18n } = useTranslation('console');
  const [section, setSection] = useState('overview');
  const isNe = i18n.language === 'ne';

  return (
    <div className="bg-bg text-text flex min-h-dvh flex-col">
      <header className="border-border bg-surface-raised flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="bg-primary text-brand-text grid h-8 w-8 place-items-center rounded-input"
          >
            <ShieldCheck size={16} strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold">{t('brand')}</p>
            <p className="text-text-faint text-xs">{t('tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => i18n.changeLanguage(isNe ? 'en' : 'ne')}
            aria-label={t('language')}
            aria-pressed={isNe}
            className="border-border text-text-muted hover:bg-surface-sunken focus-visible:ring-primary rounded-input border px-2.5 py-1.5 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            {isNe ? 'ने' : 'EN'}
          </button>
          <ThemeToggle />
          <IconButton label={t('signOut')} onClick={onSignOut}>
            <LogOut size={15} strokeWidth={1.75} />
          </IconButton>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        <nav aria-label={t('nav.label')} className="md:w-52 md:shrink-0">
          <ul className="flex gap-1 overflow-x-auto md:grid md:gap-1">
            {SECTIONS.map(({ id, Icon }) => {
              const active = section === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setSection(id)}
                    className={`focus-visible:ring-primary flex w-full items-center gap-2 rounded-input px-3 py-2 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none ${
                      active
                        ? 'bg-primary-soft text-primary'
                        : 'text-text-muted hover:bg-surface-sunken'
                    }`}
                  >
                    <Icon aria-hidden="true" size={15} strokeWidth={1.75} />
                    {t(`nav.${id}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="grid min-w-0 flex-1 content-start gap-5">
          <FixtureNotice />
          {section === 'overview' ? <OverviewSection summary={PLATFORM_SUMMARY} /> : null}
          {section === 'organizations' ? <OrganizationsSection /> : null}
          {section === 'accounts' ? <AccountsSection /> : null}
          {section === 'health' ? <HealthSection /> : null}
        </main>
      </div>

      <footer className="border-border text-text-faint border-t px-4 py-3 text-center text-xs sm:px-6">
        {session.email}
      </footer>
    </div>
  );
}
