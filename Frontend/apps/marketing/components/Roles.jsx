'use client';

import { useTranslation } from 'react-i18next';
import { Shield, User } from 'lucide-react';
import { initI18n } from '@swams/i18n';
import { useReveal, revealClasses } from '../hooks/useReveal.js';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/**
 * HR vs Staff (Section 12 parity row): two purpose-built views of one
 * platform, each with its own tint so the pair reads as a contrast rather
 * than two identical cards.
 */
const CARDS = [
  { key: 'hr', Icon: Shield },
  { key: 'staff', Icon: User },
];

export function Roles() {
  const { t } = useTranslation('marketing');
  const [ref, shown] = useReveal();

  return (
    <section
      id="roles"
      aria-labelledby="roles-title"
      ref={ref}
      className={`mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20 ${revealClasses(shown)}`}
    >
      <div className="max-w-[62ch]">
        <h2 id="roles-title" className="font-display text-xl font-bold md:text-2xl">
          {t('roles.kicker')}
        </h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {CARDS.map(({ key, Icon }, index) => (
          <article
            key={key}
            id={`roles-${key}`}
            className="mkt-pop mkt-sheen mkt-pop-card rounded-card border border-border bg-surface p-6"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 items-center justify-center rounded-input bg-primary-soft text-primary"
            >
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
              {t(`roles.${key}.label`)}
            </p>
            <h3 className="font-display mt-1 text-lg font-bold">{t(`roles.${key}.title`)}</h3>
            <p className="mt-2 text-sm text-text-muted">{t(`roles.${key}.body`)}</p>
            <ul className="mt-4 grid gap-2">
              {(Array.isArray(t(`roles.${key}.points`, { returnObjects: true }))
                ? t(`roles.${key}.points`, { returnObjects: true })
                : []
              ).map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-text-muted">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-pill bg-success text-on-primary"
                  >
                    <svg
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5 fill-none stroke-current stroke-[2.5]"
                    >
                      <path
                        d="M2.5 6.5l2.5 2.5 4.5-5.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
