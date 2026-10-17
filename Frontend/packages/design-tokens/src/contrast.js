/**
 * WCAG 2.2 contrast helpers (pure, DOM-free).
 * Used by the token tests to enforce Section 8.2:
 * "Verify all text pairs >= 4.5:1 in both themes before accepting."
 */

/** @param {string} hex #RGB | #RRGGBB */
export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  if (h.length !== 6) throw new Error(`Unsupported color: ${hex}`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** @param {number} channel 0–255 */
function channelLuminance(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** @param {string} hex */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * WCAG contrast ratio between two opaque colors.
 * @param {string} fg @param {string} bg
 * @returns {number} 1–21
 */
export function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** @param {string} fg @param {string} bg @param {number} min */
export function meetsContrast(fg, bg, min = 4.5) {
  return contrastRatio(fg, bg) >= min;
}
