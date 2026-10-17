import { formatPercent } from '@swams/i18n';

/**
 * One benchmark figure in its own unit, shared by the benchmark table and the
 * CSV export so the file and the screen can never format the same number two
 * ways.
 *
 * `percent` is a rate (0–100) and renders whole, because a comparison column
 * gains nothing from a decimal beside a rounded industry figure. `perMonth` /
 * `perWeek` are counts whose unit word comes from the catalog, so neither
 * locale has to guess where the word goes.
 *
 * @param {number} value
 * @param {'percent' | 'perMonth' | 'perWeek'} unit
 * @param {(key: string, params?: object) => string} t dashboard-namespace translator
 */
export function formatBenchmarkValue(value, unit, t) {
  if (unit === 'percent') return formatPercent(value, { digits: 0 });
  return t(`bench.unit.${unit}`, { value });
}
