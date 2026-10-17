'use client';

import { useTranslation } from 'react-i18next';
import { Terminal } from 'lucide-react';
import { initI18n } from '@swams/i18n';
import { useReveal, revealClasses } from '../hooks/useReveal.js';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/**
 * Code showcase (GitHub-homepage pattern): a terminal-style panel that shows
 * the product in the language teams already speak. This is SWAMS's own
 * illustrative snippet — a mock REST call against the attendance API — not a
 * reproduction of any vendor's page. Lines are value objects so the prompt,
 * output and comment each get their own tone (§9.3: colour carries meaning).
 */
const LINES = [
  { kind: 'cmd', key: 'code.lines.punch' },
  { kind: 'out', key: 'code.lines.punchOut' },
  { kind: 'gap' },
  { kind: 'cmd', key: 'code.lines.team' },
  { kind: 'out', key: 'code.lines.teamOut' },
  { kind: 'gap' },
  { kind: 'note', key: 'code.lines.note' },
];

const toneFor = (kind) => {
  if (kind === 'cmd') return 'text-text';
  if (kind === 'out') return 'text-success-text';
  if (kind === 'note') return 'text-text-faint';
  return '';
};

export function CodeShowcase() {
  const { t } = useTranslation('marketing');
  const [ref, shown] = useReveal();

  return (
    <section
      aria-labelledby="code-title"
      ref={ref}
      className={`border-y border-border bg-surface ${revealClasses(shown)}`}
    >
      <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">{t('code.kicker')}</p>
          <h2 id="code-title" className="font-display mt-3 text-xl font-bold md:text-2xl">
            {t('code.title')}
          </h2>
          <p className="mt-3 max-w-[54ch] text-md text-text-muted">{t('code.lead')}</p>
          <ul className="mt-6 grid gap-2">
            {(Array.isArray(t('code.points', { returnObjects: true }))
              ? t('code.points', { returnObjects: true })
              : []
            ).map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-text-muted">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <figure className="mkt-float-tilt relative overflow-hidden rounded-hero border border-border bg-bg shadow-1">
          <div
            aria-hidden="true"
            className="mkt-glow pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
          />
          <figcaption className="relative flex items-center gap-2 border-b border-border bg-surface-sunken px-4 py-2.5 text-xs text-text-muted">
            <Terminal aria-hidden="true" size={14} strokeWidth={1.75} />
            {t('code.terminalLabel')}
          </figcaption>
          <pre className="relative overflow-x-auto p-4 text-xs leading-relaxed">
            <code>
              {LINES.map((line, index) =>
                line.kind === 'gap' ? (
                  <span key={index} className="block h-3" />
                ) : (
                  <span
                    key={index}
                    className={`mkt-pop block font-mono ${toneFor(line.kind)}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {line.kind === 'cmd' ? (
                      <span className="select-none text-primary">{t('code.prompt')}</span>
                    ) : null}
                    {t(line.key)}
                  </span>
                ),
              )}
            </code>
          </pre>
        </figure>
      </div>
    </section>
  );
}
