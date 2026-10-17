import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPercent } from '@swams/i18n';

/**
 * Token-driven colours only, so the chart flips with the theme and nothing
 * here is a raw hex (Section 9.3). The area carries the rate; the dashed
 * reference line carries the target the org set, which is the one comparison
 * the panel exists to make.
 */
const LINE = 'var(--chart-indigo)';
const TARGET = 'var(--danger)';
const AXIS = 'var(--text-faint)';
const GRID = 'var(--border)';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { rate } = payload[0].payload;

  return (
    <div className="border-border bg-surface rounded-input border px-3 py-2 shadow-1">
      <div className="text-text-muted text-xs">{label}</div>
      <div className="tabular text-sm font-semibold">{formatPercent(rate)}</div>
    </div>
  );
}

/**
 * The Recharts canvas for the attendance trend, kept in its own module so
 * `OrgTrendChart` can `lazy()` it. Section 5A requires Recharts to be
 * lazy-loaded and 8.11 keeps it out of the initial bundle — this file must
 * never be imported statically from a route.
 *
 * @param {{ data: Array<{date: string, label: string, rate: number}>, target: number, targetLabel: string }} props
 */
export function OrgTrendCanvas({ data, target, targetLabel }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 46, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="org-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.3} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          width={52}
          domain={['dataMin - 4', 'dataMax + 4']}
          tickFormatter={(value) => formatPercent(value, { digits: 0 })}
          tick={{ fill: AXIS, fontSize: 12 }}
        />
        <Tooltip cursor={{ stroke: GRID }} content={<ChartTooltip />} />
        <ReferenceLine
          y={target}
          stroke={TARGET}
          strokeDasharray="4 3"
          label={{ value: targetLabel, position: 'right', fill: TARGET, fontSize: 11 }}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke={LINE}
          strokeWidth={2}
          fill="url(#org-trend-fill)"
          dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
