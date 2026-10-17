import { test, expect } from '@playwright/test';

/**
 * Contrast + "is it even visible?" audit across the product pages (Section 8.2:
 * every text pair >= 4.5:1 in BOTH themes; Section 8.9: a component that only
 * means something through colour must still be legible).
 *
 * Why this exists as a test rather than a one-off look: the light theme is the
 * one nobody stares at while building, and a token edit two slices later can
 * quietly wash a panel out. The token tests (`packages/design-tokens`) already
 * guard the pairs the theme *defines*; this one guards what the pages actually
 * render — computed colours, real stacking, both themes, both widths.
 *
 * Two failures are possible per element:
 *  - **text** below WCAG AA (4.5:1, or 3:1 for large type) against the surface
 *    it really sits on, with alpha composited through its ancestors;
 *  - a **flat panel** — a filled box with no border that is under 1.1:1 against
 *    what is behind it, i.e. a card you cannot see the edges of.
 */

/** Routes with real content for a reviewer session (HR Manager). */
const PAGES = [
  ['home', '/'],
  ['attendance', '/attendance'],
  ['history', '/attendance/history'],
  ['team board', '/attendance/team'],
  ['corrections', '/attendance/corrections'],
  ['leave', '/leave'],
  ['settings', '/settings'],
  ['audit', '/audit'],
  ['reports', '/reports'],
  ['task board', '/work/tasks'],
  ['calendar', '/calendar'],
  ['messages', '/messages'],
  ['meetings', '/meetings'],
  ['video', '/video'],
  ['meetup', '/meetup'],
  ['team', '/team'],
];

/**
 * Runs in the page: every text node's colour against its composited
 * background, plus panels that are invisible against what is behind them.
 * @returns {{text: object[], flat: object[], scrollW: number, win: number}}
 */
function auditDom() {
  const rgb = (value) => {
    const parts = String(value).match(/[\d.]+/g);
    if (!parts) return null;
    const [r, g, b, a = 1] = parts.map(Number);
    return { r, g, b, a };
  };

  /** Flatten `color` (with alpha) over `base`. */
  const over = (color, base) => ({
    r: color.r * color.a + base.r * (1 - color.a),
    g: color.g * color.a + base.g * (1 - color.a),
    b: color.b * color.a + base.b * (1 - color.a),
    a: 1,
  });

  const luminance = ({ r, g, b }) => {
    const channel = (value) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const WHITE = { r: 255, g: 255, b: 255, a: 1 };

  /** The colour actually painted behind `node`, ancestors composited. */
  const backgroundOf = (node) => {
    const chain = [];
    for (let el = node; el; el = el.parentElement) {
      const bg = rgb(getComputedStyle(el).backgroundColor);
      if (bg && bg.a > 0) chain.push(bg);
      if (bg && bg.a === 1) break;
    }
    return chain.reduceRight((base, layer) => over(layer, base), WHITE);
  };

  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${cls.split(/\s+/).slice(0, 4).join('.')}`;
  };

  const text = [];
  const flat = [];

  /**
   * A gradient or image behind the ink cannot be resolved to one colour, so a
   * ratio computed there would be fiction (the initials avatars are the case:
   * white on a token gradient is fine, white on "nothing" is not).
   */
  const imageBacked = (node) => {
    for (let el = node; el; el = el.parentElement) {
      if (getComputedStyle(el).backgroundImage !== 'none') return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue; // sr-only, decorative shims
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;

    const label = describe(el);
    const bg = backgroundOf(el);
    const onImage = imageBacked(el);

    const own = [...el.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 1,
    );
    if (own && !onImage) {
      const fg = rgb(style.color);
      const composited = fg.a < 1 ? over(fg, bg) : fg;
      const size = Number.parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const min = large ? 3 : 4.5;
      const ratio = contrast(composited, bg);
      if (ratio < min) {
        text.push({
          el: label,
          text: el.textContent.trim().slice(0, 40),
          color: style.color,
          ratio: Number(ratio.toFixed(2)),
          min,
        });
      }
    }

    /*
     * A filled, *rounded* box with no edge of any kind — no border, no shadow —
     * sitting within 1.1:1 of what is behind it: a panel whose edges nobody can
     * find. The page wrapper, the flush sidebar and the shell's own surfaces are
     * square and therefore not panels; they are the ground everything sits on.
     */
    const own_bg = rgb(style.backgroundColor);
    const width =
      Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderLeftWidth);
    const square = Number.parseFloat(style.borderTopLeftRadius) === 0;
    const shadowed = style.boxShadow !== 'none';
    if (
      own_bg &&
      own_bg.a >= 0.4 &&
      style.backgroundImage === 'none' &&
      width === 0 &&
      !square &&
      !shadowed &&
      rect.width * rect.height > 3000
    ) {
      const parentBg = el.parentElement ? backgroundOf(el.parentElement) : WHITE;
      const ratio = contrast(over(own_bg, parentBg), parentBg);
      if (ratio < 1.1) {
        flat.push({ el: label, bg: style.backgroundColor, ratio: Number(ratio.toFixed(2)) });
      }
    }
  }

  return {
    text,
    flat,
    scrollW: document.documentElement.scrollWidth,
    win: window.innerWidth,
  };
}

/**
 * Pin the resting colours before measuring.
 *
 * The theme is switched on a page that is already painted, and every element
 * with `transition-colors` (the nav links, most buttons) then animates from the
 * old ink to the new one. A measurement taken mid-flight reads that mixture, not
 * a token: a dark nav label came back as #4F596D / 2.57:1 while it was only 4%
 * of the way from the light #4B5568 to the dark #9BA3BC. The audit is about the
 * colours the theme *defines*, so it stops the clock first.
 */
async function freezeTransitions(page) {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
}

/** Sign in once — HR Manager sees every screen on the list. */
async function signIn(page) {
  // The root gate sends guests to /landing; /login is the direct door.
  await page.goto('/login');
  await page.getByLabel(/work email/i).fill('sarah@swams.com');
  await page.getByLabel(/^password/i).fill('correct-horse-1');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
  await page.waitForLoadState('networkidle');
}

test('every page is legible in both themes', async ({ page }) => {
  await signIn(page);

  const problems = [];

  for (const theme of ['light', 'dark']) {
    for (const [name, path] of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // A fresh document drops the injected style, so re-freeze after every goto.
      await freezeTransitions(page);
      // AFTER the navigation: the app re-applies the persisted theme on load, so
      // setting the attribute before `goto` measures the other theme entirely.
      await page.evaluate(
        (next) => document.documentElement.setAttribute('data-theme', next),
        theme,
      );
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const result = await page.evaluate(auditDom);

      for (const row of result.text) {
        problems.push(
          `[${theme}] ${name}: text ${row.ratio}:1 (needs ${row.min}) — "${row.text}" ${row.color} in ${row.el}`,
        );
      }
      for (const row of result.flat) {
        problems.push(
          `[${theme}] ${name}: invisible panel ${row.ratio}:1 — ${row.bg} in ${row.el}`,
        );
      }
      if (result.scrollW > result.win) {
        problems.push(
          `[${theme}] ${name}: page scrolls sideways (${result.scrollW} > ${result.win})`,
        );
      }
    }
  }

  expect(
    problems,
    `${problems.length} contrast/visibility problems:\n${problems.join('\n')}`,
  ).toEqual([]);
});
