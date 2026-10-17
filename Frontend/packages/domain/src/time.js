/**
 * Attendance time math (Section 5, packages/domain).
 * Pure functions over minutes/Date — no DOM, no i18n side effects.
 */

/** Minutes worked per day before overtime accrues (org-configurable later). */
export const DEFAULT_OVERTIME_THRESHOLD_MIN = 480; // 8h

/**
 * Merge clock segments into worked minutes.
 * Segments with a missing `end` are treated as still running when `now` is given.
 * @param {{ start: Date|string|number, end?: Date|string|number|null }[]} segments
 * @param {{ now?: Date|string|number, capPerSegmentMin?: number }} [options]
 * @returns {number} total minutes
 */
export function workedMinutes(segments, options = {}) {
  const toMs = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());
  let total = 0;
  for (const seg of segments ?? []) {
    const start = toMs(seg.start);
    const end = seg.end == null && options.now != null ? toMs(options.now) : toMs(seg.end);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    let minutes = Math.max(0, Math.round((end - start) / 60_000));
    if (options.capPerSegmentMin) minutes = Math.min(minutes, options.capPerSegmentMin);
    total += minutes;
  }
  return total;
}

/**
 * Overtime preview for the punch confirmation sheet (Section 7.1 confirmOut).
 * @param {{ workedMin: number, scheduledMin?: number, thresholdMin?: number }} input
 * @returns {{ workedMin: number, expectedMin: number, overtimeMin: number, underMin: number }}
 */
export function overtimePreview({ workedMin, scheduledMin, thresholdMin }) {
  const expected = scheduledMin ?? thresholdMin ?? DEFAULT_OVERTIME_THRESHOLD_MIN;
  const overtime = Math.max(0, workedMin - expected);
  return {
    workedMin: Math.max(0, workedMin),
    expectedMin: expected,
    overtimeMin: overtime,
    underMin: Math.max(0, expected - workedMin),
  };
}

/**
 * Clock drift notice (Section 7.1): compare client time to the last server time.
 * @param {Date|string|number} clientNow
 * @param {Date|string|number} serverNow
 * @param {number} [limitMs]
 */
export function isClockDriftAcceptable(clientNow, serverNow, limitMs = 120_000) {
  const c = clientNow instanceof Date ? clientNow.getTime() : new Date(clientNow).getTime();
  const s = serverNow instanceof Date ? serverNow.getTime() : new Date(serverNow).getTime();
  if (Number.isNaN(c) || Number.isNaN(s)) return false;
  return Math.abs(c - s) <= limitMs;
}

/**
 * Does a leave range overlap an existing range? (Section 7.4 policy preview)
 * @param {{ start: string|Date, end: string|Date }} a
 * @param {{ start: string|Date, end: string|Date }} b
 */
export function rangesOverlap(a, b) {
  const t = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());
  return t(a.start) <= t(b.end) && t(b.start) <= t(a.end);
}
