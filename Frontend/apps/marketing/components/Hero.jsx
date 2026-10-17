'use client';

import { useTranslation } from 'react-i18next';
import { Play, Sparkles } from 'lucide-react';
import { initI18n } from '@swams/i18n';
import { DEMO_URL } from '../lib/env.js';
import { useReveal, revealClasses } from '../hooks/useReveal.js';
import { ProductPreview } from './ProductPreview.jsx';
import { SignupForm } from './SignupForm.jsx';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/**
 * Hero — the GitHub-homepage shape (centred headline, one inline sign-up
 * form, a single secondary action), rendered with SWAMS's own brand and copy
 * and the shared marketing motion kit: a drifting aurora glow, a shimmering
 * gradient accent word and a gently floating product preview. The preview is
 * the page's memorable element (§9.1); the sign-up form is the one action that
 * converts — it opens the demo sign-in page at its own URL (§7.3).
 */
export function Hero() {
  const { t } = useTranslation('marketing');
  const industries = t('hero.industries', { returnObjects: true });
  const industryList = Array.isArray(industries) ? industries : [];
  const [ref, shown] = useReveal();

  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Drifting aurora glow behind the headline — decorative, never announced. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="mkt-aurora -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 bg-primary/25" />
        <span
          className="mkt-aurora left-[18%] top-10 h-56 w-56 bg-accent/20"
          style={{ animationDelay: '5s' }}
        />
        <span
          className="mkt-aurora right-[16%] top-24 h-52 w-52 bg-violet/20"
          style={{ animationDelay: '9s' }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1180px] px-4 pb-10 pt-14 text-center md:px-6 md:pb-14 md:pt-20">
        <p className="mkt-pop mb-6 inline-flex items-center gap-2 rounded-pill border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-text-muted backdrop-blur">
          <Sparkles aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
          {t('hero.kicker')}
        </p>

        <h1
          id="hero-title"
          className="font-display mx-auto max-w-[22ch] text-balance text-2xl font-bold md:text-3xl lg:text-4xl"
        >
          {t('hero.titleLead')} <span className="mkt-gradient-text">{t('hero.titleAccent')}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[58ch] text-pretty text-md text-text-muted">
          {t('hero.lead')}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="mkt-cta w-full max-w-md">
            <SignupForm size="lg" idPrefix="hero" />
          </div>
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-text-faint">
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-text"
            >
              <Play aria-hidden="true" size={14} strokeWidth={1.75} />
              {t('cta.button')}
            </a>
            <a href="#features" className="transition-colors hover:text-text">
              {t('hero.ctaModules')}
            </a>
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {['hero.factModules', 'hero.factInstalls', 'hero.factViews'].map((key, index) => (
            <li key={key} className="mkt-pop" style={{ animationDelay: `${index * 90}ms` }}>
              <b className="font-display block text-xl font-bold">{t(`${key}.value`)}</b>
              <span className="text-xs text-text-faint">{t(`${key}.label`)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-text-faint">{t('hero.industriesLabel')}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {industryList.map((industry, index) => (
              <li
                key={industry}
                className="mkt-pop mkt-pop-card rounded-pill border border-border bg-surface/70 px-2.5 py-0.5 text-xs text-text-muted"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {industry}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        ref={ref}
        className={`mx-auto w-full max-w-[1180px] px-4 pb-14 md:px-6 md:pb-20 ${revealClasses(shown)}`}
      >
        <div className="mkt-float mx-auto max-w-3xl">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
