import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Languages, LogIn, Menu, X } from 'lucide-react';
import { buttonVariants, cn, IconButton, ThemeToggle } from '@swams/ui';
import { APP_URL, SIGN_IN_URL } from '../links.js';

/** Section anchors — the landing is one page today (Section 13). */
const LINKS = [
  { href: '#features', key: 'nav.features' },
  { href: '#workflow', key: 'nav.workflow' },
  { href: '#roles', key: 'nav.roles' },
  { href: '#pricing', key: 'nav.pricing' },
];

/**
 * Landing header (Section 13), organised in three zones: the brand, the
 * section anchors as a pill-hover nav, and a right-hand cluster — the same
 * language + theme utilities the app uses, behind a hairline divider, then
 * the two actions that matter: the secondary "Live demo" and, loudest of
 * all, the primary "Sign in" (filled brand button, icon, resting shadow).
 * Both actions open the app in a new tab so the landing page stays open.
 * The anchor nav collapses into a disclosed panel on small screens with the
 * actions repeated full-width inside it.
 */
export function Header() {
  const { t, i18n } = useTranslation('marketing');
  const { t: tc } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // A hairline shadow once the page scrolls under the sticky bar, so the bar
  // separates from the content it overlaps (passive — never blocks scrolling).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Same en/ne switch as the app Topbar, persisted where i18n reads it back.
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
    <header
      className={cn(
        'border-border bg-bg/90 sticky top-0 z-sticky border-b backdrop-blur transition-shadow duration-feedback ease-standard',
        scrolled && 'shadow-1',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-2 px-4 md:gap-3 md:px-6">
        <a href="#top" className="flex items-center gap-2" aria-label={tc('app.name')}>
          <span
            aria-hidden="true"
            className="bg-primary text-on-primary grid h-8 w-8 place-items-center rounded-input"
          >
            <Fingerprint size={16} strokeWidth={1.75} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            {t('nav.brandWord')}
          </span>
        </a>

        <nav
          aria-label={t('nav.primary')}
          className="ml-4 hidden items-center gap-1 md:flex"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-pill text-text-muted hover:bg-surface-sunken hover:text-text px-3 py-1.5 text-sm font-medium transition-colors duration-feedback ease-standard"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <IconButton
            label={tc('language.switch')}
            onClick={toggleLanguage}
            aria-pressed={i18n.language === 'ne'}
            className="border-border text-text-muted hover:bg-surface-sunken hover:text-text hidden bg-transparent sm:inline-flex"
          >
            <Languages aria-hidden="true" size={18} strokeWidth={1.75} />
          </IconButton>
          <ThemeToggle />

          {/* Hairline between the utility toggles and the actions. */}
          <span aria-hidden="true" className="bg-border mx-1 hidden h-6 w-px sm:block" />

          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'hidden sm:inline-flex')}
          >
            {t('nav.demo')}
          </a>
          <a
            href={SIGN_IN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'md' }), 'font-semibold shadow-1')}
          >
            <LogIn aria-hidden="true" size={16} strokeWidth={2} />
            {t('nav.signIn')}
          </a>
          <button
            type="button"
            aria-label={t('nav.primary')}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="border-border text-text-muted hover:bg-surface-sunken rounded-button border p-2 md:hidden"
          >
            {open ? (
              <X aria-hidden="true" size={16} strokeWidth={1.75} />
            ) : (
              <Menu aria-hidden="true" size={16} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          aria-label={t('nav.primary')}
          className="border-border bg-surface flex flex-col gap-1 border-t px-4 py-3 md:hidden"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text hover:bg-surface-sunken rounded-input px-2 py-2 text-sm font-medium"
            >
              {t(link.key)}
            </a>
          ))}
          <div className="bg-border my-2 h-px" aria-hidden="true" />
          <div className="flex justify-end">
            <IconButton
              label={tc('language.switch')}
              onClick={toggleLanguage}
              aria-pressed={i18n.language === 'ne'}
            >
              <Languages aria-hidden="true" size={18} strokeWidth={1.75} />
            </IconButton>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'w-full')}
            >
              {t('nav.demo')}
            </a>
            <a
              href={SIGN_IN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'md' }), 'w-full font-semibold')}
            >
              <LogIn aria-hidden="true" size={16} strokeWidth={2} />
              {t('nav.signIn')}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
