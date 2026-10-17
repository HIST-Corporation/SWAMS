import { useTranslation } from 'react-i18next';
import { BellRing, Brain, TrendingUp } from 'lucide-react';
import { Card, CardTitle, ErrorState, Skeleton } from '@swams/ui';
import { useOrgDashboard } from '../hooks/useDashboard.js';

/**
 * Insight kind → tint + glyph. The prototype used three translucent tints with
 * a saturated icon; these are the sanctioned `*-soft` / `*-text` pairs so both
 * themes clear 4.5:1 (Section 9.3), and the title beside each glyph always
 * names the kind in words (8.9 — colour and icon never carry meaning alone).
 */
const KINDS = {
  predict: { tone: 'bg-primary-soft text-primary', Icon: Brain },
  trend: { tone: 'bg-success-soft text-success-text', Icon: TrendingUp },
  risk: { tone: 'bg-warning-soft text-warning-text', Icon: BellRing },
};

/**
 * OrgInsights — the prototype's "AI Insights" panel (`SWAMS_Unified.html`,
 * `#ai-insights`): the three advisory rows a reviewer reads before the detail.
 *
 * The server names each row by i18n key and sends its figures as params, the
 * same shape notifications already use (contract request 17), so the sentence a
 * reader sees is ours and the numbers in it are the server's — the panel can
 * never invent a number a screen elsewhere contradicts. The endpoint behind it
 * is contract request 25 and does not exist yet, which is why the composition
 * that mounts this panel is labelled as sample data (§12.1).
 */
export function OrgInsights() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="insights-heading">
        <CardTitle id="insights-heading">{t('insight.title')}</CardTitle>
        <div className="grid gap-2.5">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} block className="h-16 rounded-input" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const rows = board?.insights ?? [];

  return (
    <Card aria-labelledby="insights-heading">
      <CardTitle id="insights-heading">{t('insight.title')}</CardTitle>

      {rows.length === 0 ? (
        <div className="text-sm">
          <p className="text-text">{t('insight.emptyTitle')}</p>
          <p className="text-text-faint mt-1">{t('insight.emptyBody')}</p>
        </div>
      ) : (
        <ul className="grid gap-2.5">
          {rows.map((row) => {
            const { tone, Icon } = KINDS[row.kind] ?? KINDS.trend;
            return (
              <li
                key={row.id}
                className="bg-surface-sunken flex items-start gap-3 rounded-input px-3.5 py-3"
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-input ${tone}`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t(row.titleKey)}</p>
                  <p className="text-text-muted mt-0.5 text-xs">{t(row.bodyKey, row.params)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
