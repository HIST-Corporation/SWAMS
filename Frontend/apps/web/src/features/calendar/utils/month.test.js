// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addDays,
  clampToMonth,
  isIsoDate,
  isoDay,
  monthBounds,
  nepalToday,
  stepMonthIso,
  weekdayIndex,
} from './month.js';

const BOUNDS = monthBounds(2026, 10); // October 2026

describe('month helpers', () => {
  it('derives the month from Nepal wall-clock time, not the browser', () => {
    // 2026-10-31T19:00Z is already 1 November in Kathmandu (+05:45).
    expect(nepalToday(new Date('2026-10-31T19:00:00Z')).iso).toBe('2026-11-01');
    // …and 18:00Z is still 31 October there.
    expect(nepalToday(new Date('2026-10-31T18:00:00Z')).iso).toBe('2026-10-31');
  });

  it('moves whole days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-10-12', 7)).toBe('2026-10-19');
    expect(addDays('2026-10-12', -7)).toBe('2026-10-05');
  });

  it('steps a month and clamps a day the target month does not have', () => {
    expect(stepMonthIso('2026-10-12', 1)).toBe('2026-11-12');
    expect(stepMonthIso('2026-10-12', -1)).toBe('2026-09-12');
    expect(stepMonthIso('2026-12-31', 1)).toBe('2027-01-31');
    // 31 January + 1 month is the 28th of February, never an invented 31st.
    expect(stepMonthIso('2026-01-31', 1)).toBe('2026-02-28');
    // A leap year keeps the 29th.
    expect(stepMonthIso('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('keeps a date inside its month', () => {
    expect(clampToMonth('2026-09-28', BOUNDS)).toBe('2026-10-01');
    expect(clampToMonth('2026-11-01', BOUNDS)).toBe('2026-10-31');
    expect(clampToMonth('2026-10-15', BOUNDS)).toBe('2026-10-15');
  });

  it('starts the week on Sunday, so a month opens on its real weekday', () => {
    expect(weekdayIndex('2026-10-01')).toBe(4); // a Thursday
    expect(isoDay(2026, 10, 1)).toBe('2026-10-01');
    expect(isIsoDate('2026-10-01')).toBe(true);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-10-01T00:00:00Z')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});
