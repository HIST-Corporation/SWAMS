import { useTranslation } from 'react-i18next';
import { Play, Sparkles } from 'lucide-react';
import { buttonVariants } from '@swams/ui';
import { APP_URL } from '../links.js';
import { useReveal, revealClasses } from '../hooks/useReveal.js';
import { SignupForm } from './SignupForm.jsx';
import { ProductPreview } from './ProductPreview.jsx';

/**
 * Hero — the GitHub-homepage shape (centred headline, one inline sign-up form,
 * a single secondary action), rendered with SWAMS's own brand and copy and the
 * shared marketing motion kit: a drifting aurora glow, a shimmering gradient
 * accent word and a gently floating product preview. The preview is the page's
 * memorable element (§9.1); the sign-up form is the one action that converts —
 * it opens the demo sign-in page in a new tab at `/demo` (§7.3).
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
        <span className="mkt-aurora bg-primary/25 -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2" />
        <span
          className="mkt-aurora bg-accent/20 top-10 left-[18%] h-56 w-56"
          style={{ animationDelay: '5s' }}
        />
        <span
          className="mkt-aurora bg-violet/20 top-24 right-[16%] h-52 w-52"
          style={{ animationDelay: '9s' }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-14 pb-10 text-center md:px-6 md:pt-20 md:pb-14">
        <p className="border-border bg-surface/80 text-text-muted mkt-pop mb-6 inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-xs font-medium backdrop-blur">
          <Sparkles aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
          {t('hero.kicker')}
        </p>

        <h1
          id="hero-title"
          className="font-display mx-auto max-w-[22ch] text-2xl font-bold text-balance md:text-3xl lg:text-4xl"
        >
          {t('hero.titleLead')} <span className="mkt-gradient-text">{t('hero.titleAccent')}</span>
        </h1>
        <p className="text-text-muted mx-auto mt-4 max-w-[58ch] text-md text-pretty">
          {t('hero.lead')}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-full max-w-md">
            <SignupForm size="lg" idPrefix="hero" />
          </div>
          <p className="text-text-faint flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'quiet', size: 'sm' })}
            >
              <Play aria-hidden="true" size={14} strokeWidth={1.75} />
              {t('cta.button')}
            </a>
            <a href="#features" className="hover:text-text transition-colors">
              {t('hero.ctaModules')}
            </a>
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {['hero.factModules', 'hero.factInstalls', 'hero.factViews'].map((key, index) => (
            <li key={key} className="mkt-pop" style={{ animationDelay: `${index * 90}ms` }}>
              <b className="font-display block text-xl font-bold">{t(`${key}.value`)}</b>
              <span className="text-text-faint text-xs">{t(`${key}.label`)}</span>
            </li>
          ))}
        </ul>

        <div className="border-border mt-10 border-t pt-6">
          <p className="text-text-faint text-xs">{t('hero.industriesLabel')}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {industryList.map((industry, index) => (
              <li
                key={industry}
                className="border-border bg-surface/70 text-text-muted mkt-pop mkt-pop-card rounded-pill border px-2.5 py-0.5 text-xs"
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
