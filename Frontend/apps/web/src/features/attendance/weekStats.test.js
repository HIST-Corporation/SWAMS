import { describe, expect, it } from 'vitest';
import { weekSeries, weekStats } from './weekStats.js';

/** A week's rows as `GET /attendance/history` hands them back. */
const row = (date, workedMinutes) => ({ date, workedMinutes });

/**
 * Sunday 2026-10-04 through Saturday 2026-10-10 in Nepal. Fixed rather than
 * "now" so the assertions are about the arithmetic, not the day the test runs.
 */
const SUNDAY = '2026-10-04';
const WEEK = [
  row('2026-09-27', 500), // last week — must not leak into the totals
  row('2026-10-04', 486),
  row('2026-10-05', 0), // a real zero, not a missing day
  row('2026-10-06', 462),
  row('2026-10-07', 508),
];
/** Wednesday 2026-10-07, three days into that week. */
const WEDNESDAY = new Date('2026-10-07T04:00:00.000Z');

describe('weekStats', () => {
  it('totals only the current Nepal week, counting a zero day as unworked', () => {
    const stats = weekStats(WEEK, WEDNESDAY);
    expect(stats.start).toBe(SUNDAY);
    expect(stats.minutes).toBe(486 + 0 + 462 + 508);
    expect(stats.days).toBe(3);
  });

  it('reports how far into the week we are, so an unfinished week is not a collapse', () => {
    expect(weekStats(WEEK, WEDNESDAY).elapsed).toBe(4);
    // Sunday is day one, and Saturday is as far as the count ever goes — a
    // Sunday belongs to the next week and starts the count over at one.
    expect(weekStats([], new Date('2026-10-04T04:00:00.000Z')).elapsed).toBe(1);
    expect(weekStats([], new Date('2026-10-10T04:00:00.000Z')).elapsed).toBe(7);
    expect(weekStats([], new Date('2026-10-11T04:00:00.000Z')).elapsed).toBe(1);
  });

  it('starts the week on Sunday in Asia/Kathmandu, not in the browser timezone', () => {
    // 21:15 UTC on Saturday is already Sunday in Nepal (UTC+05:45), so the
    // week that opens belongs to Nepal's calendar, and a Saturday row from the
    // week that is ending is still excluded.
    const lateSaturdayUtc = new Date('2026-10-03T21:15:00.000Z');
    const stats = weekStats([row('2026-10-03', 480), row('2026-10-04', 120)], lateSaturdayUtc);
    expect(stats.start).toBe(SUNDAY);
    expect(stats.minutes).toBe(120);
  });

  it('reports an empty week as zero days rather than zero hours of work', () => {
    expect(weekStats([], WEDNESDAY)).toMatchObject({ minutes: 0, days: 0 });
  });

  it('tolerates rows without worked minutes instead of throwing', () => {
    expect(weekStats([{ date: '2026-10-04' }], WEDNESDAY).minutes).toBe(0);
  });
});

describe('weekSeries', () => {
  it('returns all seven days, oldest first, keeping a gap as a real zero', () => {
    const series = weekSeries(WEEK, WEDNESDAY);
    expect(series).toHaveLength(7);
    expect(series[0].date).toBe('2026-10-04');
    expect(series[6].date).toBe('2026-10-10');
    expect(series.map((day) => day.minutes)).toEqual([486, 0, 462, 508, 0, 0, 0]);
    expect(series[1].hours).toBe(0);
    expect(series[0].hours).toBeCloseTo(8.1);
  });

  it('labels each day with its weekday index so a name can be looked up', () => {
    const series = weekSeries([], WEDNESDAY);
    expect(series.map((day) => day.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('ignores rows from other weeks and duplicates the count only once', () => {
    const series = weekSeries([row('2026-09-30', 600), row('2026-10-04', 10)], WEDNESDAY);
    expect(series[0].minutes).toBe(10);
    expect(series.reduce((sum, day) => sum + day.minutes, 0)).toBe(10);
  });
});
