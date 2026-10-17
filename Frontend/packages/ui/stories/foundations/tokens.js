import tokens from '@swams/design-tokens/tokens.json';

export const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export const swatchVars = (name) => ({
  background: `var(--${kebab(name)})`,
});

export const panelStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)',
  padding: 'var(--space-6)',
};

export const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 'var(--space-4)',
};

export const labelStyle = {
  fontSize: 'var(--font-size-sm)',
  lineHeight: 'var(--line-height-body)',
};

export const codeStyle = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--text-faint)',
  fontVariantNumeric: 'tabular-nums',
};

export { tokens };
