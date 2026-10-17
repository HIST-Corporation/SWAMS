import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDuration } from '@swams/i18n';

/**
 * Token-driven colours only, so the chart flips with the theme and nothing
 * here is a raw hex (Section 9.3). Indigo bars on the current token set pass
 * 3:1 against `--surface`, which is the requirement for graphical objects.
 */
const BAR = 'var(--chart-indigo)';
const BAR_GAP = 'var(--surface-sunken)';
const AXIS = 'var(--text-faint)';
const GRID = 'var(--border)';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { minutes } = payload[0].payload;

  return (
    <div className="border-border bg-surface rounded-input border px-3 py-2 shadow-1">
      <div className="text-text-muted text-xs">{label}</div>
      <div className="tabular text-sm font-semibold">
        {minutes > 0 ? formatDuration(minutes) : '—'}
      </div>
    </div>
  );
}

/**
 * The Recharts canvas, kept in its own module so `WeekChart` can `lazy()` it.
 * Section 5A requires Recharts to be lazy-loaded and 8.11 keeps it out of the
 * initial bundle — this file must never be imported statically from a route.
 *
 * @param {{ data: Array<{date: string, label: string, minutes: number, hours: number}> }} props
 */
export function WeekChartCanvas({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
        barCategoryGap="26%"
      >
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: AXIS, fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={48}
          allowDecimals={false}
          tick={{ fill: AXIS, fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-sunken)', fillOpacity: 0.55 }}
          content={<ChartTooltip />}
        />
        <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
          {data.map((row) => (
            <Cell key={row.date} fill={row.minutes > 0 ? BAR : BAR_GAP} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
