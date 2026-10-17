import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { buttonVariants } from '@swams/ui';
import { APP_URL } from '../links.js';
import { useReveal, revealClasses } from '../hooks/useReveal.js';
import { SignupForm } from './SignupForm.jsx';

/**
 * Closing call to action (GitHub-homepage pattern): one centred band, one inline
 * sign-up form, one secondary "watch the demo" link. The form opens the demo
 * sign-in page in a new tab at `/demo` so a first-time visitor can explore the
 * real product without losing the landing page; the link does the same at its
 * own URL (§7.3).
 */
export function DemoCta() {
  const { t } = useTranslation('marketing');
  const [ref, shown] = useReveal();

  return (
    <section aria-labelledby="demo-cta-title" ref={ref} className={revealClasses(shown)}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 text-center md:px-6 md:py-20">
        <div className="border-primary/30 bg-primary-soft relative mx-auto max-w-3xl overflow-hidden rounded-hero border p-8 md:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="mkt-aurora bg-primary/25 -top-16 left-[15%] h-48 w-48" />
            <span
              className="mkt-aurora bg-accent/20 -bottom-16 right-[15%] h-52 w-52"
              style={{ animationDelay: '6s' }}
            />
          </div>
          <div className="relative">
            <h2 id="demo-cta-title" className="font-display text-xl font-bold md:text-2xl">
              {t('cta.title')}
            </h2>
            <p className="text-text-muted mx-auto mt-3 max-w-[56ch] text-md">{t('cta.body')}</p>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="w-full max-w-md">
                <SignupForm size="lg" idPrefix="cta" />
              </div>
              <a
                href={APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonVariants({ variant: 'quiet', size: 'sm' })}`}
              >
                <Play aria-hidden="true" size={14} strokeWidth={1.75} />
                {t('cta.button')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
