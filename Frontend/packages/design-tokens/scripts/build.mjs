#!/usr/bin/env node
/**
 * Generates the distributable token artifacts from tokens.json:
 *   css/tokens.css  — CSS custom properties, light on :root, dark on [data-theme="dark"]
 *   rn-theme.js     — plain objects for the future React Native skin (Section 11 rule 2)
 * Run: pnpm --filter @swams/design-tokens build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = join(HERE, '..');

export function loadTokens(root = PKG_ROOT) {
  return JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
}

/** camelCase / PascalCase → kebab-case */
export const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

const GENERATED =
  '/* GENERATED FILE — do not edit by hand.\n' +
  ' * Source: tokens.json · Regenerate: pnpm --filter @swams/design-tokens build\n' +
  ' * Contrast of every text pair is verified by packages/design-tokens tests.\n' +
  ' * Every hex colour also emits an `-rgb` channel triple (`--primary-rgb: 61 83 224`)\n' +
  ' * so Tailwind can put an alpha on a token: `bg-primary/15` compiles to\n' +
  ' * `rgb(var(--primary-rgb) / 0.15)`. Without the triple, Tailwind emits NOTHING\n' +
  ' * for a `/opacity` utility — a class that looks like it works and does not. */\n';

/**
 * `#RRGGBB` / `#RGB` → `R G B` channel triple. Values that are not plain hex
 * (`rgba(...)` overlays) return null: they carry their own alpha and stay a
 * single custom property.
 * @param {string} value
 * @returns {string|null}
 */
export function channels(value) {
  const hex = String(value).trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(' ');
}

/** @param {ReturnType<typeof loadTokens>} tokens */
export function buildCss(tokens) {
  const light = [];
  const dark = [];

  for (const [name, value] of Object.entries(tokens.color)) {
    light.push(`  --${kebab(name)}: ${value.light};`);
    dark.push(`  --${kebab(name)}: ${value.dark};`);
    const lightRgb = channels(value.light);
    const darkRgb = channels(value.dark);
    if (lightRgb) light.push(`  --${kebab(name)}-rgb: ${lightRgb};`);
    if (darkRgb) dark.push(`  --${kebab(name)}-rgb: ${darkRgb};`);
  }
  for (const [hue, pair] of Object.entries(tokens.chip)) {
    if (hue === 'category') continue;
    light.push(`  --chip-${hue}-bg: ${pair.light.bg};`, `  --chip-${hue}-fg: ${pair.light.fg};`);
    dark.push(`  --chip-${hue}-bg: ${pair.dark.bg};`, `  --chip-${hue}-fg: ${pair.dark.fg};`);
    const chipRgb = (side) => {
      const bg = channels(pair[side].bg);
      const fg = channels(pair[side].fg);
      const vars = [];
      if (bg) vars.push(`  --chip-${hue}-bg-rgb: ${bg};`);
      if (fg) vars.push(`  --chip-${hue}-fg-rgb: ${fg};`);
      return vars;
    };
    light.push(...chipRgb('light'));
    dark.push(...chipRgb('dark'));
  }
  // Chart series are theme-independent (color-blind safe set, Section 8.2).
  const chart = Object.entries(tokens.chart).map(([name, hex]) => `  --chart-${name}: ${hex};`);

  for (const [level, recipe] of Object.entries(tokens.elevation.light)) {
    light.push(`  --shadow-${level}: ${recipe};`);
  }
  for (const [level, recipe] of Object.entries(tokens.elevation.dark)) {
    dark.push(`  --shadow-${level}: ${recipe};`);
  }

  const common = [
    ...chart,
    ...tokens.space.map((s) => `  --space-${s}: ${s}px;`),
    ...Object.entries(tokens.radius).map(([name, px]) => `  --radius-${kebab(name)}: ${px}px;`),
    ...Object.entries(tokens.type.family).map(
      ([name, stack]) => `  --font-${kebab(name)}: ${stack};`,
    ),
    ...Object.entries(tokens.type.size).map(
      ([name, px]) => `  --font-size-${kebab(name)}: ${px}px;`,
    ),
    `  --line-height-body: ${tokens.type.lineHeight.body};`,
    `  --line-height-heading: ${tokens.type.lineHeight.heading};`,
    `  --line-height-devanagari: ${tokens.type.lineHeight.devanagari};`,
    `  --max-width-reading: ${tokens.type.maxWidthCh}ch;`,
    `  --max-width-page: ${tokens.type.maxWidthPage};`,
    ...Object.entries(tokens.motion.duration).map(([name, ms]) => `  --duration-${name}: ${ms}ms;`),
    `  --ease-standard: ${tokens.motion.ease};`,
    ...Object.entries(tokens.zIndex).map(([name, z]) => `  --z-${name}: ${z};`),
  ];

  return (
    GENERATED +
    '\n:root {\n  color-scheme: light;\n' +
    light.join('\n') +
    '\n\n' +
    common.join('\n') +
    '\n}\n\n' +
    ":root[data-theme='dark'], [data-theme='dark'] {\n  color-scheme: dark;\n" +
    dark.join('\n') +
    '\n}\n\n' +
    '/* Re-assert light values inside explicitly light-scoped subtrees (e.g. a light\n   panel rendered within a dark page, or the Storybook side-by-side review). */\n' +
    "[data-theme='light'] {\n  color-scheme: light;\n" +
    light.join('\n') +
    '\n}\n'
  );
}

/** @param {ReturnType<typeof loadTokens>} tokens */
export function buildRnTheme(tokens) {
  const flatten = (side) => {
    const out = {};
    for (const [name, value] of Object.entries(tokens.color)) out[kebab(name)] = value[side];
    for (const [hue, pair] of Object.entries(tokens.chip)) {
      if (hue === 'category') continue;
      out[`chip-${hue}-bg`] = pair[side].bg;
      out[`chip-${hue}-fg`] = pair[side].fg;
    }
    for (const [level, recipe] of Object.entries(tokens.elevation[side])) {
      out[`shadow-${level}`] = recipe;
    }
    return out;
  };
  return (
    '/* GENERATED FILE — do not edit by hand. Source: tokens.json */\n' +
    'export const light = ' +
    JSON.stringify(flatten('light'), null, 2) +
    ';\n\n' +
    'export const dark = ' +
    JSON.stringify(flatten('dark'), null, 2) +
    ';\n\n' +
    'export default { light, dark };\n'
  );
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const tokens = loadTokens();
  mkdirSync(join(PKG_ROOT, 'css'), { recursive: true });
  writeFileSync(join(PKG_ROOT, 'css', 'tokens.css'), buildCss(tokens));
  writeFileSync(join(PKG_ROOT, 'rn-theme.js'), buildRnTheme(tokens));
  console.log('design-tokens: wrote css/tokens.css and rn-theme.js');
}
