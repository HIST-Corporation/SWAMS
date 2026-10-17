import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@swams/ui';
import { AnalyticsPanel, PERIODS } from '../components/AnalyticsPanel.jsx';

/**
 * `/analytics` — week / month / year progress (§12, the insights analytics the
 * sidebar promised). Behind `analytics.read`; one period tab owns the whole
 * composition below it, so the tabs and the tiles can never disagree.
 */
export function AnalyticsPage() {
  const { t } = useTranslation('reports');
  const [period, setPeriod] = useState('week');

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl">{t('analytics.title')}</h1>
          <p className="text-text-muted mt-1 text-sm">{t('analytics.subtitle')}</p>
        </div>
        <div role="group" aria-label={t('analytics.periodLabel')} className="flex gap-1.5">
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
              className={cn(
                'rounded-button border px-3 py-1.5 text-xs font-medium transition',
                period === option
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-text-muted hover:bg-surface-sunken',
              )}
            >
              {t(`analytics.period.${option}`)}
            </button>
          ))}
        </div>
      </header>

      <AnalyticsPanel key={period} period={period} />
    </div>
  );
}
