import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDuration } from '@swams/i18n';

/** Token colours only (Section 9.3). Bars the week misses draw as gaps (§9.7). */
const BAR = 'var(--chart-indigo)';
const AXIS = 'var(--text-faint)';
const GRID = 'var(--border)';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { minutes } = payload[0].payload;

  return (
    <div className="border-border bg-surface rounded-input border px-3 py-2 shadow-1">
      <div className="text-text-muted text-xs">{label}</div>
      <div className="tabular text-sm font-semibold">
        {minutes != null ? formatDuration(minutes) : ''}
      </div>
    </div>
  );
}

/**
 * Worked-minutes bars for the analytics payload — kept lazy like every
 * Recharts canvas (§5A/8.11), so the chart ships in its own chunk and never
 * in the initial bundle.
 *
 * @param {{ data: Array<{date: string, label: string, minutes?: number|null}> }} props
 */
export function AnalyticsBarsCanvas({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: AXIS, fontSize: 12 }}
          minTickGap={24}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(value) => `${Math.round(value / 60)}h`}
          tick={{ fill: AXIS, fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: GRID }} content={<ChartTooltip />} />
        <Bar dataKey="minutes" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
