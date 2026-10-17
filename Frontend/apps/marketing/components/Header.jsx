'use client';

import { ThemeProvider, ThemeToggle } from '@swams/ui';
import { useTranslation } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { DEMO_URL, SIGN_IN_URL } from '../lib/env.js';
import { BrandMark } from './BrandMark.jsx';
import { LanguageSwitch } from './LanguageSwitch.jsx';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/** Section anchors — the site is one page today (Section 13). */
const LINKS = [
  { href: '#features', key: 'nav.features' },
  { href: '#workflow', key: 'nav.workflow' },
  { href: '#roles', key: 'nav.roles' },
  { href: '#pricing', key: 'nav.pricing' },
];

/**
 * Marketing header (Section 13): same light/dark toggle as the app, the same
 * en/ne choice, and one primary action — open the live product.
 */
export function Header() {
  const { t } = useTranslation('marketing');

  return (
    <ThemeProvider>
      <a className="mk-skip" href="#main">
        {t('nav.skip')}
      </a>
      <header className="sticky top-0 z-sticky border-b border-border bg-surface">
        <div className="mk-wrap flex h-16 items-center gap-3">
          <a href="#top" className="flex items-center gap-2">
            <BrandMark size={32} className="shrink-0" />
            <span className="text-lg font-bold">
              SWAMS<span className="text-primary">.</span>
            </span>
          </a>

          <nav
            aria-label={t('nav.primary')}
            className="ml-6 hidden items-center gap-6 text-sm font-medium text-text-muted md:flex"
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors duration-feedback ease-standard hover:text-text"
              >
                {t(link.key)}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
            <a
              href={SIGN_IN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm font-medium text-text-muted transition-colors duration-feedback ease-standard hover:text-text sm:inline-flex"
            >
              {t('nav.signIn')}
            </a>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mk-btn mk-btn--primary hidden text-sm sm:inline-flex"
            >
              {t('cta.button')}
            </a>
          </div>
        </div>
      </header>
    </ThemeProvider>
  );
}
