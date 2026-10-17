import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTokens, buildCss, buildRnTheme, PKG_ROOT } from '../scripts/build.mjs';
import { contrastRatio, meetsContrast } from './contrast.js';

const tokens = loadTokens();
const color = (name, theme) => tokens.color[name][theme];

/** [foreground, background, minRatio] — all in both themes (Section 8.2). */
const TEXT_PAIRS = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surfaceRaised'],
  ['text', 'surfaceSunken'],
  ['textMuted', 'bg'],
  ['textMuted', 'surface'],
  ['textFaint', 'bg'],
  ['textFaint', 'surface'],
  ['textFaint', 'surfaceRaised'],
  ['textFaint', 'surfaceSunken'],
  ['onPrimary', 'primary'],
  ['primary', 'bg'],
  ['primary', 'surface'],
  ['accentText', 'accentSoft'],
  ['successText', 'successSoft'],
  ['successText', 'surface'],
  ['warningText', 'warningSoft'],
  ['warningText', 'surface'],
  ['dangerText', 'dangerSoft'],
  ['dangerText', 'surface'],
  ['infoText', 'infoSoft'],
  ['infoText', 'surface'],
  // Inverse navigation surface (2026-10-11 Home rebuild): idle, hover, group
  // label, active pill and the logo accent, all against the rail itself.
  ['navText', 'navBg'],
  ['navText', 'navBorder'],
  ['navTextStrong', 'navBg'],
  ['navLabel', 'navBg'],
  ['navActiveText', 'navActiveBg'],
  ['accent', 'navBg'],
  // The video room's stage: dark in both themes by design, so it is verified
  // like any other text pair rather than trusted.
  ['stageText', 'stageBg'],
  ['stageText', 'stageRaised'],
  ['stageMuted', 'stageBg'],
  ['stageMuted', 'stageRaised'],
];

describe('design-tokens artifacts', () => {
  it('css/tokens.css is in sync with tokens.json', () => {
    const onDisk = readFileSync(join(PKG_ROOT, 'css', 'tokens.css'), 'utf8');
    expect(onDisk).toBe(buildCss(tokens));
  });

  it('rn-theme.js is in sync with tokens.json', () => {
    const onDisk = readFileSync(join(PKG_ROOT, 'rn-theme.js'), 'utf8');
    expect(onDisk).toBe(buildRnTheme(tokens));
  });

  it('defines both light and dark values for every color token', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(value.light, `${name}.light`).toBeTruthy();
      expect(value.dark, `${name}.dark`).toBeTruthy();
    }
  });

  it('uses the role-based radii from the 2026-10-11 prototype port', () => {
    // SWAMS_Unified.html: --radius-sm 8 (inputs, buttons), --radius 12 (cards),
    // --radius-lg 16 (the lavender side panel).
    expect(tokens.radius).toEqual({
      input: 8,
      button: 8,
      card: 12,
      heroCard: 16,
      sheet: 24,
      pill: 9999,
    });
  });

  it('uses the 4-pt spacing scale from Section 8.2', () => {
    expect(tokens.space).toEqual([4, 8, 12, 16, 20, 24, 32, 40, 56, 80]);
  });
});

describe('contrast (WCAG 2.2 AA, both themes)', () => {
  for (const theme of ['light', 'dark']) {
    describe(theme, () => {
      for (const [fg, bg] of TEXT_PAIRS) {
        it(`${fg} on ${bg} >= 4.5:1`, () => {
          const ratio = contrastRatio(color(fg, theme), color(bg, theme));
          expect(
            meetsContrast(color(fg, theme), color(bg, theme), 4.5),
            `${fg} on ${bg}: ${ratio.toFixed(2)}:1`,
          ).toBe(true);
        });
      }

      for (const hue of Object.keys(tokens.chip)) {
        if (hue === 'category') continue;
        it(`chip ${hue} fg on bg >= 4.5:1`, () => {
          const { bg, fg } = tokens.chip[hue][theme];
          const ratio = contrastRatio(fg, bg);
          expect(meetsContrast(fg, bg, 4.5), `chip ${hue}: ${ratio.toFixed(2)}:1`).toBe(true);
        });
        it(`chip ${hue} fg on surface >= 4.5:1`, () => {
          const { fg } = tokens.chip[hue][theme];
          const ratio = contrastRatio(fg, color('surface', theme));
          expect(meetsContrast(fg, color('surface', theme), 4.5), `${ratio.toFixed(2)}:1`).toBe(
            true,
          );
        });
      }

      it('focus ring (primary) has >= 3:1 against bg (non-text UI)', () => {
        expect(contrastRatio(color('primary', theme), color('bg', theme))).toBeGreaterThanOrEqual(
          3,
        );
      });
    });
  }
});
