const TEAM = [
  { name: 'Ramesh Adhikari', status: 'in', tint: 'teal' },
  { name: 'Anita Thapa', status: 'break', tint: 'marigold' },
  { name: 'Prakash Gurung', status: 'late', tint: 'rose' },
  { name: 'Sunita Rai', status: 'leave', tint: 'violet' },
  { name: 'Bibek Karki', status: 'out', tint: 'indigo' },
];

const STATUS_TEXT = {
  in: 'In · Baneshwor',
  break: 'On break',
  late: 'Late 24m',
  leave: 'On leave',
  out: 'Not yet in',
};

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}

/**
 * Miniature Staff Home (Section 8.6 wireframe) used to review tokens in both
 * themes side by side. Sample data is the Section 8.8 Nepali fixture set.
 */
export function MiniDashboard({ theme }) {
  return (
    <div
      data-theme={theme}
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        borderRadius: 'var(--radius-sheet)',
        padding: 'var(--space-6)',
        display: 'grid',
        gap: 'var(--space-5)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 'var(--font-size-lg)' }}>Good morning, Sita</div>
        <div
          className="tabular"
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}
        >
          Bhadra 12, 2083 / Aug 28, 2026
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-4)' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-hero-card)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Clocked in at 09:02 · Baneshwor
          </div>
          <div
            className="tabular"
            style={{ fontSize: 'var(--font-size-2xl)', lineHeight: 'var(--line-height-heading)' }}
          >
            4h 18m
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <span
              style={{
                background: 'var(--primary)',
                color: 'var(--on-primary)',
                borderRadius: 'var(--radius-button)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              Take a break
            </span>
            <span
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-button)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              Clock out
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-sm)' }}>Leave left</div>
          <div className="tabular" style={{ fontSize: 'var(--font-size-xl)' }}>
            11 days
          </div>
        </div>

        <div
          style={{
            background: 'var(--primary-soft)',
            color: 'var(--primary)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-5)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-sm)' }}>This week</div>
          <div className="tabular" style={{ fontSize: 'var(--font-size-xl)' }}>
            31h 40m
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)' }}>+2h OT</div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-5)',
        }}
      >
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Needs you (2)
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 'var(--space-3) 0 0',
            padding: 0,
            display: 'grid',
            gap: 'var(--space-3)',
          }}
        >
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <span>Review Rajan&apos;s PR</span>
            <span style={{ color: 'var(--text-muted)' }}>due today</span>
          </li>
          <li
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <span>Sign off timesheet</span>
            <span style={{ color: 'var(--text-muted)' }}>due today</span>
          </li>
        </ul>
      </div>

      <div>
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Team now
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {TEAM.map((person) => (
            <div key={person.name} style={{ textAlign: 'center', width: 'var(--space-20)' }}>
              <div
                style={{
                  width: 'var(--space-10)',
                  height: 'var(--space-10)',
                  margin: '0 auto',
                  borderRadius: 'var(--radius-pill)',
                  background: `var(--chip-${person.tint}-bg)`,
                  color: `var(--chip-${person.tint}-fg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                {initials(person.name)}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)' }}>
                {person.name.split(' ')[0]}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-faint)' }}>
                {STATUS_TEXT[person.status]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
