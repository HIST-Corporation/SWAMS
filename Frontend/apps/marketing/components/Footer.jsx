'use client';

import { useTranslation } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { DEMO_URL, SIGN_IN_URL } from '../lib/env.js';
import { BrandMark } from './BrandMark.jsx';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/**
 * Footer (Section 13). Only links that resolve today: the page's own sections,
 * the two anchored role panels and the live product. Pages that have not
 * shipped (Security, Contact, Blog, Legal) stay out rather than dead-linking.
 */
export function Footer() {
  const { t } = useTranslation('marketing');

  const product = [
    { href: '#features', key: 'nav.features' },
    { href: '#workflow', key: 'nav.workflow' },
    { href: '#pricing', key: 'nav.pricing' },
    { href: SIGN_IN_URL, key: 'nav.signIn', external: true },
    { href: DEMO_URL, key: 'nav.demo', external: true },
  ];
  const roles = [
    { href: '#roles-hr', key: 'roles.hr.label' },
    { href: '#roles-staff', key: 'roles.staff.label' },
  ];

  return (
    <footer className="bg-surface">
      <div className="mk-wrap grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold">
            <BrandMark size={24} className="shrink-0" />
            <span>
              SWAMS<span className="text-primary">.</span>
            </span>
          </p>
          <p className="mt-2 max-w-[42ch] text-sm text-text-muted">{t('footer.tagline')}</p>
        </div>

        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="text-sm font-semibold">
            {t('footer.product')}
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-text-muted">
            {product.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="transition-colors duration-feedback ease-standard hover:text-text"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-roles">
          <h2 id="footer-roles" className="text-sm font-semibold">
            {t('footer.roles')}
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-text-muted">
            {roles.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  className="transition-colors duration-feedback ease-standard hover:text-text"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border">
        <p className="mk-wrap py-4 text-xs text-text-faint">{t('footer.rights')}</p>
      </div>
    </footer>
  );
}
