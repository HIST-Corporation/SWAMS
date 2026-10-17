import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import { SIGN_IN_URL } from '../links.js';

/** Footer columns — anchors on this page, and the one outbound action (new tab). */
const COLUMNS = [
  {
    heading: 'footer.product',
    links: [
      { href: '#features', key: 'nav.features' },
      { href: '#workflow', key: 'nav.workflow' },
      { href: '#pricing', key: 'nav.pricing' },
      { href: SIGN_IN_URL, key: 'nav.signIn', external: true },
    ],
  },
  {
    heading: 'footer.roles',
    links: [
      { href: '#roles', key: 'roles.hr.label' },
      { href: '#roles', key: 'roles.staff.label' },
    ],
  },
];

/**
 * Landing footer (Section 13): brand + tagline, the product and role links,
 * and the copyright line. Every link is either an in-page anchor or a route —
 * nothing decorative.
 */
export function Footer() {
  const { t } = useTranslation('marketing');

  return (
    <footer className="border-border bg-surface border-t">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_repeat(2,1fr)]">
          <div>
            <a href="#top" className="flex items-center gap-2">
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
            <p className="text-text-faint mt-3 max-w-[40ch] text-sm">{t('footer.tagline')}</p>
          </div>

          {COLUMNS.map((column) => (
            <nav
              key={column.heading}
              aria-label={t(column.heading)}
              className="grid content-start gap-2"
            >
              <h2 className="text-text-faint text-xs font-semibold uppercase tracking-wide">
                {t(column.heading)}
              </h2>
              {column.links.map((link) =>
                link.external ? (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text text-sm transition-colors duration-feedback ease-standard"
                  >
                    {t(link.key)}
                  </a>
                ) : (
                  <a
                    key={link.key}
                    href={link.href}
                    className="text-text-muted hover:text-text text-sm transition-colors duration-feedback ease-standard"
                  >
                    {t(link.key)}
                  </a>
                ),
              )}
            </nav>
          ))}
        </div>

        <p className="text-text-faint border-border mt-8 border-t pt-6 text-xs">
          {t('footer.rights')} {'·'} {t('footer.demoNote')}
        </p>
      </div>
    </footer>
  );
}
