import { useTranslation } from 'react-i18next';
import { ThemeProvider } from '@swams/ui';
import { CodeShowcase } from '../components/CodeShowcase.jsx';
import { DemoCta } from '../components/DemoCta.jsx';
import { Footer } from '../components/Footer.jsx';
import { Header } from '../components/Header.jsx';
import { Hero } from '../components/Hero.jsx';
import { Modules } from '../components/Modules.jsx';
import { Pricing } from '../components/Pricing.jsx';
import { Roles } from '../components/Roles.jsx';
import { Workflow } from '../components/Workflow.jsx';

/**
 * `/landing` — the public marketing page (Section 13 parity row, ported from
 * `design-prototype/SWAMS_Landing.html`). Public: no RequireAuth, no app
 * chrome, so a first-time visitor lands here and the only action that matters
 * is signing in — the session machine owns what happens after (§7.3).
 *
 * Sections, in the order the prototype reads them: hero (centred, with the
 * inline sign-up form that opens `/demo` in a new tab), the eight modules, the API/code
 * showcase, three steps, HR vs Staff, the pricing teaser and the closing CTA.
 * Every string comes from the shared `marketing` namespace, so en + ne both
 * work and the app's own catalogs stay the single source.
 */
export function LandingPage() {
  const { t } = useTranslation('marketing');
  const { t: tc } = useTranslation('common');

  return (
    <ThemeProvider>
      <div className="bg-bg text-text flex min-h-dvh flex-col">
        <a
          href="#main"
          className="focus:bg-surface focus:text-text sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-input focus:border focus:border-border focus:px-4 focus:py-2"
        >
          {t('nav.skip')}
        </a>

        <Header />

        <main id="main" className="flex-1">
          <h1 className="sr-only">{tc('app.tagline')}</h1>
          <Hero />
          <Modules />
          <CodeShowcase />
          <Workflow />
          <Roles />
          <Pricing />
          <DemoCta />
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
}
