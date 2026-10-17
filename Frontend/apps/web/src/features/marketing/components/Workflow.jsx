import { useTranslation } from 'react-i18next';
import { ArrowRight, ChartNoAxesColumn, MessageSquare } from 'lucide-react';
import { useReveal, revealClasses } from '../hooks/useReveal.js';

/**
 * Three steps (Section 12 parity row). The step number is a list counter, so
 * the heading stays the only thing a screen reader announces for each step —
 * the numeral is decorative (aria-hidden) rather than read aloud twice.
 */
const STEPS = [
  { key: 'signIn', Icon: ArrowRight },
  { key: 'work', Icon: MessageSquare },
  { key: 'pattern', Icon: ChartNoAxesColumn },
];

export function Workflow() {
  const { t } = useTranslation('marketing');
  const [ref, shown] = useReveal();

  return (
    <section
      id="workflow"
      aria-labelledby="workflow-title"
      ref={ref}
      className={`border-border bg-surface border-y ${revealClasses(shown)}`}
    >
      <div className="mx-auto w-full max-w-[1180px] px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-[62ch]">
          <p className="text-primary text-sm font-semibold">{t('steps.kicker')}</p>
          <h2 id="workflow-title" className="font-display mt-3 text-xl font-bold md:text-2xl">
            {t('steps.title')}
          </h2>
        </div>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ key, Icon }, index) => (
            <li
              key={key}
              className="border-border bg-bg mkt-pop mkt-sheen mkt-pop-card rounded-card border p-6"
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="bg-primary-soft text-primary grid h-9 w-9 place-items-center rounded-input"
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span aria-hidden="true" className="text-text-faint tabular font-display text-sm">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold">{t(`steps.items.${key}.title`)}</h3>
              <p className="text-text-muted mt-1 text-sm">{t(`steps.items.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
