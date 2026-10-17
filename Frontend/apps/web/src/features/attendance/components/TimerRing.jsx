/**
 * TimerRing (§8.7 domain-ui): the punch card's one piece of motion. It answers
 * an action (you clocked in) and nothing else — the progress stroke only
 * transitions when the value changes, and reduced motion removes even that.
 *
 * @param {{ workedMinutes: number, expectedMinutes?: number, size?: number, label: string, sublabel?: string }} props
 */
export function TimerRing({ workedMinutes, expectedMinutes = 480, size = 148, label, sublabel }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = expectedMinutes > 0 ? Math.min(1, Math.max(0, workedMinutes / expectedMinutes)) : 0;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-sheet motion-safe:ease-standard"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tabular text-2xl font-semibold">{label}</span>
        {sublabel ? <span className="text-text-muted text-xs">{sublabel}</span> : null}
      </div>
    </div>
  );
}
