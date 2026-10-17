import { codeStyle, labelStyle, panelStyle, tokens } from './tokens.js';

export default {
  title: 'Foundations/Spacing, Radii, Elevation, Motion',
  parameters: { layout: 'padded' },
};

export const Spacing = {
  render: () => (
    <div style={panelStyle}>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        4-pt scale (Section 8.2). Panels pad with space-24, cards gap with space-16.
      </p>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {tokens.space.map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ ...codeStyle, width: 'var(--space-14)' }}>space-{s}</div>
            <div
              style={{
                height: 'var(--space-8)',
                width: `var(--space-${s})`,
                background: 'var(--primary-soft)',
                borderRadius: 'var(--radius-input)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Radii = {
  render: () => (
    <div style={panelStyle}>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Radii by role — never one radius everywhere (Section 8.2, 9.2).
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
        {Object.entries(tokens.radius).map(([name, px]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 'var(--space-20)',
                height: 'var(--space-20)',
                borderRadius: `var(--radius-${name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())})`,
                background: 'var(--primary-soft)',
                border: '1px solid var(--border)',
              }}
            />
            <div style={{ ...codeStyle, marginTop: 'var(--space-2)' }}>
              {name} · {px}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Elevation = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--space-6)',
      }}
    >
      {['1', '2'].map((level) => (
        <div
          key={level}
          style={{
            background: 'var(--surface-raised)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--space-6)',
            boxShadow: `var(--shadow-${level})`,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-md)' }}>Elevation {level}</div>
          <p style={{ ...labelStyle, color: 'var(--text-muted)', marginBottom: 0 }}>
            Light theme: soft tinted shadow. Dark theme: lifted surface + 1px border, no heavy
            shadow (Section 8.2).
          </p>
        </div>
      ))}
    </div>
  ),
};

export const Motion = {
  render: () => (
    <div style={panelStyle}>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Motion answers an action only (Section 8.2, 9.5). Everything is off under
        prefers-reduced-motion. Hover a block to see its duration.
      </p>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {Object.entries(tokens.motion.duration).map(([name, ms]) => {
          // Literal class names so Tailwind's content scan sees them.
          const durationClass = {
            feedback: 'duration-feedback',
            reveal: 'duration-reveal',
            sheet: 'duration-sheet',
          }[name];
          return (
            <div
              key={name}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}
            >
              <div style={{ ...codeStyle, width: 'var(--space-20)' }}>
                {name} · {ms}ms
              </div>
              <button
                type="button"
                aria-label={`Preview ${name} transition, ${ms} milliseconds`}
                className={`${durationClass} h-8 w-20 cursor-pointer rounded-input border border-accent bg-accent-soft transition-colors ease-standard hover:bg-accent focus-visible:bg-accent`}
              />
            </div>
          );
        })}
      </div>
      <p style={{ ...labelStyle, color: 'var(--text-faint)', marginTop: 'var(--space-4)' }}>
        Ease: <span style={codeStyle}>{tokens.motion.ease}</span>
      </p>
    </div>
  ),
};
