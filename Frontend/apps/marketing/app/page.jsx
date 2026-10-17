import { CodeShowcase } from '../components/CodeShowcase.jsx';
import { DemoCta } from '../components/DemoCta.jsx';
import { Hero } from '../components/Hero.jsx';
import { Modules } from '../components/Modules.jsx';
import { Pricing } from '../components/Pricing.jsx';
import { Roles } from '../components/Roles.jsx';
import { Workflow } from '../components/Workflow.jsx';

/**
 * Home (Section 13, Section 12 parity row): centred hero with the animated
 * product preview, the eight modules, the API/code showcase, three steps,
 * HR vs Staff, pricing teaser and the demo call to action — light/dark,
 * 360/768/1280, en + ne.
 *
 * Sections are client components (they read i18next) but Next still prerenders
 * them, so the static export ships English HTML for crawlers and swaps to the
 * visitor's stored language after hydration.
 */
export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <Modules />
      <CodeShowcase />
      <Workflow />
      <Roles />
      <Pricing />
      <DemoCta />
    </main>
  );
}
