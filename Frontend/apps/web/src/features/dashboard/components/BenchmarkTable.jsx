import { useTranslation } from 'react-i18next';
import { Badge, Card, CardTitle, ErrorState, Skeleton } from '@swams/ui';
import { formatPercent } from '@swams/i18n';
import { useOrgDashboard } from '../hooks/useDashboard.js';
import { formatBenchmarkValue } from '../utils/units.js';

/** Status → badge tone. The word beside it carries the meaning (Section 8.9). */
const TONES = { better: 'success', low: 'warning', high: 'danger' };

/**
 * BenchmarkTable — the prototype's "Industry Benchmark" table
 * (`SWAMS_Unified.html`): four metrics, ours against the industry, with a
 * status chip.
 *
 * A real `<table>` with `scope`d headers, inside a horizontally scrollable
 * wrapper so 360px never squeezes four columns into unreadable slivers. The
 * prototype printed the SWAMS column in green/amber/red, which read as a
 * second status signal on top of the chip; here both value columns are plain
 * ink and only the chip carries the verdict — and it carries it in words.
 */
export function BenchmarkTable() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="bench-heading" className="min-w-0">
        <CardTitle id="bench-heading">{t('bench.title')}</CardTitle>
        <Skeleton block className="h-40 rounded-input" />
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const rows = board?.benchmarks ?? [];

  return (
    // `min-w-0`: the table's 420px floor must scroll inside its own wrapper,
    // not widen the page — a grid item keeps `auto` as its minimum otherwise.
    <Card aria-labelledby="bench-heading" className="min-w-0">
      <CardTitle id="bench-heading">{t('bench.title')}</CardTitle>

      {rows.length === 0 ? (
        <div className="text-sm">
          <p className="text-text">{t('bench.emptyTitle')}</p>
          <p className="text-text-faint mt-1">{t('bench.emptyBody')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <caption className="sr-only">{t('bench.caption')}</caption>
            <thead>
              <tr className="text-text-faint text-xs">
                <th
                  scope="col"
                  className="border-border border-b px-2 py-2 text-left font-semibold"
                >
                  {t('bench.colMetric')}
                </th>
                <th
                  scope="col"
                  className="border-border border-b px-2 py-2 text-left font-semibold"
                >
                  {t('bench.colSwams')}
                </th>
                <th
                  scope="col"
                  className="border-border border-b px-2 py-2 text-left font-semibold"
                >
                  {t('bench.colIndustry')}
                </th>
                <th
                  scope="col"
                  className="border-border border-b px-2 py-2 text-left font-semibold"
                >
                  {t('bench.colStatus')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th
                    scope="row"
                    className="border-border text-text border-b px-2 py-2.5 text-left font-medium"
                  >
                    {t(`bench.metric.${row.metric}`)}
                  </th>
                  <td className="tabular border-border border-b px-2 py-2.5">
                    {formatBenchmarkValue(row.swams, row.unit, t)}
                  </td>
                  <td className="tabular border-border text-text-muted border-b px-2 py-2.5">
                    {formatBenchmarkValue(row.industry, row.unit, t)}
                  </td>
                  <td className="border-border border-b px-2 py-2.5">
                    <Badge tone={TONES[row.status] ?? 'neutral'}>
                      {row.delta !== undefined
                        ? t('bench.delta', { value: formatPercent(row.delta, { digits: 1 }) })
                        : t(`bench.status.${row.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
