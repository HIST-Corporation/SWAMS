import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * The donut canvas for WorkforcePanel, kept in its own module so the panel can
 * `lazy()` it. Section 5A requires Recharts to be lazy-loaded and 8.11 keeps
 * it out of the initial bundle — this file must never be imported statically
 * from a route.
 *
 * `caption` is the prototype's second centre line ("Total Employees" under the
 * figure). It is passed in already translated, and stays decorative: the whole
 * canvas is `aria-hidden` in the panel, which repeats every segment as a number
 * and a word underneath (Section 8.9).
 *
 * @param {{ segments: Array<{key: string, value: number}>, total: number, caption: string }} props
 */
/**
 * Segment colour comes from the page chart palette so the figure reads as a
 * deliberate chart instead of the panel's muted dot tokens. Indigo, amber and
 * teal distinguish the active states; slate keeps the out-of-office segment
 * neutral and legible.
 */
const FILLS = {
  present: 'var(--chart-indigo)',
  late: 'var(--chart-marigold)',
  onLeave: 'var(--chart-teal)',
  notIn: 'var(--chart-slate)',
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, value } = payload[0].payload;

  return (
    <div className="border-panel-border bg-surface text-text rounded-input border px-3 py-2 shadow-1">
      <div className="text-text-faint text-xs">{label}</div>
      <div className="tabular text-sm font-semibold">{value}</div>
    </div>
  );
}

export function DonutCanvas({ segments, total, caption }) {
  const data = segments.map((seg) => ({ ...seg, name: seg.key, label: seg.key }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="90%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((seg) => (
            <Cell key={seg.key} fill={FILLS[seg.key] ?? 'var(--text-faint)'} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-panel-text font-display"
          style={{ fontSize: 24, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x="50%"
          y="50%"
          dy={20}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-panel-text"
          style={{ fontSize: 11, opacity: 0.75 }}
        >
          {caption}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
