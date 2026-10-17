import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPercent } from '@swams/i18n';

/**
 * Token-driven colours only (Section 9.3). The gradient carries the rate;
 * weekdays for day buckets, day numbers for month buckets and month names
 * for year buckets — the label vocabulary comes from the bucket date, never
 * from a hard-coded list.
 */
const LINE = 'var(--chart-indigo)';
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
 * The analytics rate curve, kept in its own module so the analytics panel can
 * `lazy()` it. Recharts ships in a separate chunk (Section 5A/8.11) — this
 * file must never be imported statically from a route.
 *
 * @param {{ data: Array<{date: string, label: string, rate: number, minutes?: number|null}> }} props
 */
export function AnalyticsTrendCanvas({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="analytics-trend-fill" x1="0" y1="0" x2="0" y2="1">
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
          minTickGap={24}
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
        <Area
          type="monotone"
          dataKey="rate"
          stroke={LINE}
          strokeWidth={2}
          fill="url(#analytics-trend-fill)"
          dot={{ r: 3, fill: LINE, strokeWidth: 0 }}
          connectNulls
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
