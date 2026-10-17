import { formatPercent } from '@swams/i18n';
import { formatBenchmarkValue } from './units.js';

/**
 * CSV cells: quote when the value carries a comma, quote or newline. A
 * department named "Design, Brand" must not split into two columns.
 * @param {unknown} value
 */
function cell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const row = (...values) => values.map(cell).join(',');

/**
 * Build the CSV for the reviewer Home's "Export" action.
 *
 * The file is a faithful transcript of what the screen states — the company
 * figures, the department rates and the benchmark comparison — formatted with
 * the SAME helpers and the SAME i18n labels the panels render (`formatPercent`,
 * the `kpi`/`dept`/`bench` keys), so the download can never quote a number or a
 * word the screen did not. Nothing is derived here that the payload did not
 * already state (Section 7.6).
 *
 * @param {object} board `GET /org/dashboard` payload
 * @param {(key: string, params?: object) => string} t dashboard-namespace translator
 * @param {{ asOf: string }} meta
 * @returns {string} CSV text (RFC 4180 line endings)
 */
export function buildOrgSnapshotCsv(board, t, { asOf }) {
  const kpi = board?.kpi ?? {};
  const lines = [
    row(t('snapshot.sectionCompany'), asOf),
    row(t('kpi.presentToday'), kpi.present ?? ''),
    row(t('kpi.attendanceRate'), formatPercent(kpi.rate ?? 0)),
    row(t('kpi.totalEmployees'), kpi.headcount ?? ''),
    row(t('kpi.onLeave'), kpi.onLeave ?? ''),
    row(t('kpi.absent'), kpi.absent ?? ''),
    '',
  ];

  const departments = board?.departments ?? [];
  if (departments.length > 0) {
    lines.push(row(t('dept.title'), t('dept.colRate')));
    for (const dept of departments) {
      lines.push(row(dept.name, formatPercent(dept.rate)));
    }
    lines.push('');
  }

  const benchmarks = board?.benchmarks ?? [];
  if (benchmarks.length > 0) {
    lines.push(
      row(t('bench.title'), t('bench.colSwams'), t('bench.colIndustry'), t('bench.colStatus')),
    );
    for (const bench of benchmarks) {
      lines.push(
        row(
          t(`bench.metric.${bench.metric}`),
          formatBenchmarkValue(bench.swams, bench.unit, t),
          formatBenchmarkValue(bench.industry, bench.unit, t),
          bench.delta === undefined
            ? t(`bench.status.${bench.status}`)
            : t('bench.delta', { value: formatPercent(bench.delta) }),
        ),
      );
    }
  }

  return `${lines.join('\r\n')}\r\n`;
}
