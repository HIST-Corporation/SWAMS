import { codeStyle, gridStyle, kebab, labelStyle, panelStyle, tokens } from './tokens.js';

export default { title: 'Foundations/Colors', parameters: { layout: 'padded' } };

function Swatches({ theme }) {
  return (
    <div
      data-theme={theme}
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>
        {theme === 'dark' ? 'Dark theme' : 'Light theme'}
      </h2>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
        Semantic surfaces, text and status colors (Section 8.2).
      </p>
      <div style={gridStyle}>
        {Object.entries(tokens.color).map(([name, value]) => (
          <div key={name} style={panelStyle}>
            <div
              style={{
                height: 'var(--space-14)',
                borderRadius: 'var(--radius-button)',
                background: `var(--${kebab(name)})`,
                border: '1px solid var(--border)',
              }}
            />
            <div style={{ ...labelStyle, marginTop: 'var(--space-2)' }}>{name}</div>
            <div style={codeStyle}>{value[theme]}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 'var(--font-size-md)', marginTop: 'var(--space-8)' }}>
        Icon-chip tints by category
      </h3>
      <div style={{ ...gridStyle, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {Object.entries(tokens.chip)
          .filter(([hue]) => hue !== 'category')
          .map(([hue, pair]) => (
            <div
              key={hue}
              style={{
                background: `var(--chip-${hue}-bg)`,
                color: `var(--chip-${hue}-fg)`,
                borderRadius: 'var(--radius-card)',
                padding: 'var(--space-4)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <strong>{hue}</strong>
              <div style={codeStyle}>{pair[theme].fg}</div>
            </div>
          ))}
      </div>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
        attendance → indigo · leave → marigold · work → teal · people → rose · comms → violet
      </p>

      <h3 style={{ fontSize: 'var(--font-size-md)', marginTop: 'var(--space-8)' }}>
        Chart series (color-blind safe, always paired with labels)
      </h3>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {Object.entries(tokens.chart).map(([name, hex]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 'var(--space-14)',
                height: 'var(--space-14)',
                borderRadius: 'var(--radius-pill)',
                background: `var(--chart-${name})`,
              }}
            />
            <div style={{ ...codeStyle, marginTop: 'var(--space-1)' }}>{name}</div>
            <div style={codeStyle}>{hex}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Side-by-side review of every color token in both themes (Section 8.3). */
export const BothThemes = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <Swatches theme="light" />
      <Swatches theme="dark" />
    </div>
  ),
};

export const LightOnly = { render: () => <Swatches theme="light" /> };
export const DarkOnly = { render: () => <Swatches theme="dark" /> };
