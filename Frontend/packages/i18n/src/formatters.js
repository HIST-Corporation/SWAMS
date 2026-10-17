/**
 * Pure formatters shared by every surface (Section 8.10).
 * DOM-free — RN-safe (Section 11 rule 1).
 */

export const NEPAL_TZ_OFFSET_MINUTES = 345; // UTC+05:45

const NE_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Latin digits → Devanagari digits.
 * @param {string|number} value
 */
export function toDevanagariDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => NE_DIGITS[Number(d)]);
}

/**
 * South-Asian (lakh/crore) digit grouping: 125000 → "1,25,000", 12500000 → "1,25,00,000".
 * @param {number} amount
 * @param {{ grouping?: 'lakh' | 'international' }} [options]
 */
export function groupAmount(amount, options = {}) {
  const grouping = options.grouping ?? 'lakh';
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const [intPart, fracPart] = String(abs).split('.');

  let grouped;
  if (grouping === 'international' || intPart.length <= 3) {
    grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return (negative ? '-' : '') + grouped + (fracPart ? '.' + fracPart : '');
}

/**
 * Money in NPR with lakh/crore grouping (Section 8.8 sample: `रू 1,25,000`).
 * @param {number} amount
 * @param {{ locale?: 'en' | 'ne', devanagariDigits?: boolean, grouping?: 'lakh' | 'international' }} [options]
 */
export function formatMoney(amount, options = {}) {
  const locale = options.locale ?? 'en';
  const grouped = groupAmount(amount, { grouping: options.grouping });
  const digits = options.devanagariDigits ? toDevanagariDigits(grouped) : grouped;
  if (locale === 'ne') return `रू ${digits}`;
  return `NPR ${digits}`;
}

/**
 * Duration in minutes → "4h 18m" / "31h 40m" (tabular contexts render this).
 * @param {number} minutes
 */
export function formatDuration(minutes) {
  const sign = minutes < 0 ? '-' : '';
  const total = Math.abs(Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * A 0–100 rate as a percentage string: 89.4 → "89.4%", 85 → "85%".
 *
 * Deliberately locale-independent and Latin-digit (Section 8.8: the app's
 * numerals stay Latin and tabular everywhere, so a rate can never look like a
 * different number in Nepali than in English). The `%` sign is appended rather
 * than formatted, because both catalogs place it as a suffix.
 * @param {number} value
 * @param {{ digits?: number }} [options]
 */
export function formatPercent(value, options = {}) {
  const digits = options.digits ?? 1;
  const rounded = Number(value.toFixed(digits));
  return `${rounded}%`;
}

/**
 * Nepal wall-clock parts for a Date (UTC+05:45).
 * @param {Date} date
 * @returns {{ year: number, month: number, day: number, hours: number, minutes: number, seconds: number }}
 */
export function nepalParts(date) {
  const shifted = new Date(date.getTime() + NEPAL_TZ_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

/**
 * "09:02" / "9:02 PM" from a Date in Nepal time.
 * @param {Date} date
 * @param {{ hour12?: boolean }} [options]
 */
export function formatClock(date, options = {}) {
  const { hours, minutes } = nepalParts(date);
  if (!options.hour12)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/**
 * AD date pair, e.g. "Aug 28, 2026".
 * The BS half is produced by packages/domain once a verified BS converter is adopted
 * (Open Decision — see docs/api-contract/contract-requests.md); this formatter never
 * invents a BS date.
 * @param {Date} date
 * @param {{ locale?: 'en-GB' | 'ne-NP' }} [options]
 */
export function formatDateAd(date, options = {}) {
  const locale = options.locale === 'ne-NP' ? 'ne-NP' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
