import { describe, it, expect } from 'vitest';
import {
  workedMinutes,
  overtimePreview,
  isClockDriftAcceptable,
  rangesOverlap,
  nepalFiscalYear,
  daysBetween,
} from './index.js';

describe('workedMinutes', () => {
  it('sums completed segments', () => {
    expect(
      workedMinutes([
        { start: '2026-08-28T03:00:00Z', end: '2026-08-28T07:00:00Z' },
        { start: '2026-08-28T07:30:00Z', end: '2026-08-28T08:00:00Z' },
      ]),
    ).toBe(270);
  });

  it('treats an open segment as running when now is supplied', () => {
    expect(
      workedMinutes([{ start: '2026-08-28T03:00:00Z', end: null }], {
        now: '2026-08-28T07:18:00Z',
      }),
    ).toBe(258);
  });

  it('ignores invalid segments instead of poisoning the total', () => {
    expect(workedMinutes([{ start: 'nope', end: null }])).toBe(0);
  });
});

describe('overtimePreview', () => {
  it('reports overtime above the 8h threshold', () => {
    const p = overtimePreview({ workedMin: 522, thresholdMin: 480 });
    expect(p.overtimeMin).toBe(42);
    expect(p.underMin).toBe(0);
  });

  it('reports shortfall below the schedule', () => {
    const p = overtimePreview({ workedMin: 300, scheduledMin: 480 });
    expect(p.overtimeMin).toBe(0);
    expect(p.underMin).toBe(180);
  });
});

describe('isClockDriftAcceptable', () => {
  it('flags drift beyond the limit', () => {
    expect(isClockDriftAcceptable('2026-08-28T03:00:00Z', '2026-08-28T03:00:30Z')).toBe(true);
    expect(isClockDriftAcceptable('2026-08-28T03:00:00Z', '2026-08-28T03:10:00Z')).toBe(false);
    expect(isClockDriftAcceptable('bad', '2026-08-28T03:00:00Z')).toBe(false);
  });
});

describe('rangesOverlap', () => {
  it('detects inclusive overlap', () => {
    const a = { start: '2026-09-01', end: '2026-09-05' };
    expect(rangesOverlap(a, { start: '2026-09-05', end: '2026-09-07' })).toBe(true);
    expect(rangesOverlap(a, { start: '2026-09-06', end: '2026-09-07' })).toBe(false);
  });
});

describe('nepalFiscalYear', () => {
  it('starts on 16 Jul and ends on 15 Jul next year', () => {
    const inFy = nepalFiscalYear('2026-08-28T00:00:00Z');
    expect(inFy.startLabel).toBe('16 Jul 2026');
    expect(inFy.endLabel).toBe('15 Jul 2027');
    expect(inFy.start.getTime()).toBeLessThanOrEqual(new Date('2026-08-28').getTime());
    expect(inFy.end.getTime()).toBeGreaterThanOrEqual(new Date('2026-08-28').getTime());
  });

  it('rolls to the previous FY before 16 Jul', () => {
    const before = nepalFiscalYear('2026-07-01T00:00:00Z');
    expect(before.startLabel).toBe('16 Jul 2025');
  });

  it('handles the exact boundary days', () => {
    expect(nepalFiscalYear('2026-07-16T00:00:00Z').index).toBe(2026);
    expect(nepalFiscalYear('2026-07-15T23:59:00Z').index).toBe(2025);
  });
});

describe('daysBetween', () => {
  it('counts inclusive calendar days', () => {
    expect(daysBetween('2026-09-01', '2026-09-05')).toBe(5);
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(1);
  });
});
