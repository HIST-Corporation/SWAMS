/**
 * Nepali fiscal year (Section 3: "Nepali fiscal year" is a day-one table-stake).
 *
 * FACT: the Nepali fiscal year runs Shrawan 1 → Ashoj 31/Bhadra 30 (mid-July → mid-September).
 * ASSUMPTION: until a verified BS↔AD converter is adopted (Open Decision — BS converter),
 * we expose AD boundaries of the FY that covers Shrawan of year Y: 16 Jul Y → 15 Jul Y+1.
 * This drifts by ±1 day from the true Shrawan 1 some years; consumers must not present it
 * as an exact BS date. The BS label is added by packages/i18n once the converter lands.
 */

/** @param {Date|string|number} date */
function toDate(date) {
  return date instanceof Date ? date : new Date(date);
}

/**
 * @param {Date|string|number} date
 * @returns {{ index: number, start: Date, end: Date, startLabel: string, endLabel: string }}
 */
export function nepalFiscalYear(date) {
  const d = toDate(date);

  // FY "year" is the year Shrawan falls in; FY spans Jul 16 → Jul 15 next year.
  const fyIndex =
    d.getUTCMonth() > 6 || (d.getUTCMonth() === 6 && d.getUTCDate() >= 16)
      ? d.getUTCFullYear()
      : d.getUTCFullYear() - 1;

  const start = new Date(Date.UTC(fyIndex, 6, 16)); // 16 Jul
  const end = new Date(Date.UTC(fyIndex + 1, 6, 15)); // 15 Jul next year

  return {
    index: fyIndex,
    start,
    end,
    startLabel: `16 Jul ${fyIndex}`,
    endLabel: `15 Jul ${fyIndex + 1}`,
  };
}

/**
 * Inclusive days between two instants (calendar-agnostic; BS handled upstream).
 * @param {Date|string|number} start @param {Date|string|number} end
 */
export function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const dayMs = 86_400_000;
  const utcS = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const utcE = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  return Math.round((utcE - utcS) / dayMs) + 1;
}
