import { useEffect, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, ErrorState, Input, Skeleton, StatTile } from '@swams/ui';
import { formatDuration } from '@swams/i18n';
import { useExportReport, useReport } from '../hooks/useReports.js';
import { defaultRange } from '../utils/range.js';

/**
 * Machine column keys per report type — these must be the payload's own keys
 * (they mirror REPORT_COLUMNS in the mock). The attendance row calls its
 * duration `workedMinutes`; reading `row.worked` rendered "NaNh NaNm" in the
 * table while the tile above it was correct.
 */
const COLUMNS = {
  attendance: ['employee', 'present', 'late', 'absent', 'onLeave', 'workedMinutes'],
  leave: ['employee', 'annual', 'sick', 'unpaid', 'special', 'totalDays'],
  tasks: ['employee', 'done', 'open', 'overdue'],
};
const TYPES = ['attendance', 'leave', 'tasks'];

/** Summary keys per type (the tiles above the table). */
const SUMMARY = {
  attendance: ['headcount', 'present', 'late', 'absent', 'onLeave', 'workedMinutes'],
  leave: ['headcount', 'annual', 'sick', 'unpaid', 'special', 'totalDays'],
  tasks: ['headcount', 'done', 'open', 'overdue'],
};

/**
 * `/reports` — org summaries behind `reports.read` (slice 7). The server owns
 * every number and the CSV; the page only filters (type + AD range), renders
 * and triggers the export. BS dates wait on the verified converter (§24).
 */
export function ReportsPage() {
  const { t } = useTranslation('reports');
  const initial = defaultRange();
  const [type, setType] = useState('attendance');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const result = useReport({ type, from, to });
  const exportReport = useExportReport();
  const { reset: resetExport } = exportReport;

  // A stale export banner must not survive a parameter change.
  const paramsKey = `${type}|${from}|${to}`;
  useEffect(() => {
    resetExport();
  }, [paramsKey, resetExport]);

  const cell = (column, value) =>
    column === 'workedMinutes' ? formatDuration(value) : String(value);

  /** `workedMinutes` is one column with one label; nothing else is renamed. */
  const labelOfColumn = (column) => (column === 'workedMinutes' ? 'worked' : column);

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="grid gap-1">
        <h1 className="text-xl">{t('title')}</h1>
        <p className="text-text-muted text-sm">{t('subtitle')}</p>
      </header>

      <form
        aria-label={t('title')}
        className="border-border bg-surface grid gap-3 rounded-card border p-4 md:grid-cols-[minmax(0,12rem)_minmax(0,10rem)_minmax(0,10rem)_auto] md:items-end"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('type')}</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="border-border bg-surface-sunken focus:border-primary rounded-input border px-3 py-2 text-sm outline-none"
          >
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`typeNames.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('from')}</span>
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-text-muted text-xs font-medium">{t('to')}</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>

        <Button
          type="button"
          variant="secondary"
          disabled={!result.report || result.rangeInvalid || exportReport.isPending}
          loading={exportReport.isPending}
          onClick={() => exportReport.mutate({ type, from, to })}
        >
          <Download aria-hidden="true" size={16} strokeWidth={1.75} />
          {exportReport.isPending ? t('exporting') : t('export')}
        </Button>
      </form>

      {result.rangeInvalid ? (
        <p role="alert" className="text-danger-text text-sm">
          {t('rangeError')}
        </p>
      ) : null}
      {exportReport.isError ? (
        <p role="alert" className="text-danger-text text-sm">
          {t('exportFailed')}
        </p>
      ) : null}
      {exportReport.isSuccess ? (
        <p role="status" className="text-success-text text-sm">
          {t('exportStarted')}
        </p>
      ) : null}

      <section aria-labelledby="report-summary-heading" className="grid gap-3">
        <h2 id="report-summary-heading" className="sr-only">
          {t('summaryTitle')}
        </h2>
        {result.isLoading ? (
          <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
        ) : result.error ? (
          <ErrorState
            message={result.error.message || t('loadError')}
            requestId={result.error.requestId}
            onRetry={result.refetch}
          />
        ) : result.rows.length === 0 ? (
          <EmptyState
            icon={<FileBarChart aria-hidden="true" size={20} strokeWidth={1.75} />}
            title={t('emptyTitle')}
            body={t('emptyBody')}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUMMARY[type].map((key) => (
                <StatTile
                  key={key}
                  label={t(`columns.${labelOfColumn(key)}`)}
                  value={cell(key, result.summary[key])}
                  tone={key === 'headcount' ? 'primary' : 'plain'}
                />
              ))}
            </div>

            <p className="text-text-faint text-xs">
              {t('meta', { count: result.rows.length, from, to })}
            </p>

            <div className="border-border overflow-x-auto rounded-card border">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <caption className="sr-only">{t(`typeNames.${type}`)}</caption>
                <thead>
                  <tr className="border-border bg-surface-sunken border-b">
                    {COLUMNS[type].map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className={`px-4 py-2.5 font-medium ${
                          column === 'employee' ? 'text-left' : 'text-right'
                        }`}
                      >
                        {t(`columns.${labelOfColumn(column)}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr
                      key={`${row.employee}-${row.session ?? ''}`}
                      className="border-border border-b last:border-0"
                    >
                      {COLUMNS[type].map((column) =>
                        column === 'employee' ? (
                          <th
                            key={column}
                            scope="row"
                            className="px-4 py-2.5 text-left font-normal"
                          >
                            {row[column]}
                          </th>
                        ) : (
                          <td key={column} className="tabular px-4 py-2.5 text-right">
                            {cell(column, row[column])}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
