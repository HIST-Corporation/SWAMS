'use client';

import { useTranslation } from 'react-i18next';
import { Check, Info } from 'lucide-react';
import { initI18n } from '@swams/i18n';
import { DEMO_URL } from '../lib/env.js';
import { useReveal, revealClasses } from '../hooks/useReveal.js';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/** Growth is the one plan allowed to carry the primary action. */
const PLANS = [
  { key: 'starter', featured: false },
  { key: 'growth', featured: true },
];

/**
 * Pricing teaser (Section 12 parity row; Section 13: indicative until the
 * owner confirms — the note says so in plain language rather than a footnote).
 */
export function Pricing() {
  const { t } = useTranslation('marketing');
  const [ref, shown] = useReveal();

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      ref={ref}
      className={`mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20 ${revealClasses(shown)}`}
    >
      <div className="max-w-[62ch]">
        <p className="text-sm font-semibold text-primary">{t('pricing.kicker')}</p>
        <h2 id="pricing-title" className="font-display mt-3 text-xl font-bold md:text-2xl">
          {t('pricing.title')}
        </h2>
        <p className="mt-4 flex max-w-[70ch] items-start gap-2 rounded-input bg-accent-soft px-3 py-2 text-sm text-accent-text">
          <Info aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {t('pricing.note')}
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {PLANS.map(({ key, featured }, index) => {
          const points = t(`pricing.${key}.points`, { returnObjects: true });
          const list = Array.isArray(points) ? points : [];
          return (
            <article
              key={key}
              className={`mkt-pop mkt-sheen mkt-pop-card grid content-start gap-4 rounded-card border p-6 ${
                featured ? 'border-primary shadow-1' : 'border-border'
              }`}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div>
                <h3 className="text-md font-semibold">{t(`pricing.${key}.name`)}</h3>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-2xl font-bold">
                    {t(`pricing.${key}.price`)}
                  </span>
                  <span className="text-sm text-text-muted">{t('pricing.perUser')}</span>
                </p>
                <p className="mt-1 text-xs text-text-faint">{t(`pricing.${key}.upTo`)}</p>
              </div>

              <ul className="grid content-start gap-2">
                {list.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-text-muted">
                    <Check
                      aria-hidden="true"
                      size={14}
                      strokeWidth={2.25}
                      className="mt-0.5 shrink-0 text-success"
                    />
                    {point}
                  </li>
                ))}
              </ul>

              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`mk-btn mkt-cta w-full ${featured ? 'mk-btn--primary' : 'mk-btn--secondary'}`}
              >
                {t('pricing.tryFree')}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
