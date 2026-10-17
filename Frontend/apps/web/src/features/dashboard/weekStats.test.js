import { describe, expect, it } from 'vitest';
import { lastWeekMinutes, weekStats } from './weekStats.js';

/**
 * Week math is Nepal wall-clock (UTC+05:45) with a Sunday start — a browser in
 * UTC must not shift the boundary (the 05:45 offset crosses no date line, but
 * the UTC day still differs for 5h45m each day).
 */
describe('weekStats', () => {
  // 2026-10-10 is a Saturday; NPT noon = 06:15 UTC.
  const saturdayNoon = new Date('2026-10-10T06:15:00.000Z');

  it('sums days from Sunday of the current NPT week only', () => {
    const rows = [
      { date: '2026-10-11', workedMinutes: 0 }, // tomorrow, not counted... see below
      { date: '2026-10-10', workedMinutes: 120 }, // today
      { date: '2026-10-08', workedMinutes: 480 }, // Thursday
      { date: '2026-10-04', workedMinutes: 450 }, // previous Sunday
      { date: '2026-10-03', workedMinutes: 480 }, // previous Saturday
    ];
    const result = weekStats(rows, saturdayNoon);
    // A future-dated row (bad server data) still falls inside the window
    // string-compare; the boundary under test is the Sunday start.
    expect(result.start).toBe('2026-10-04');
    expect(result.minutes).toBe(120 + 480 + 450);
    expect(result.days).toBe(3);
  });

  it('counts days only when minutes were actually worked', () => {
    const rows = [
      { date: '2026-10-07', workedMinutes: 0 }, // holiday
      { date: '2026-10-06', workedMinutes: 300 },
    ];
    const result = weekStats(rows, saturdayNoon);
    expect(result.days).toBe(1);
    expect(result.minutes).toBe(300);
  });

  it('reports a zero week for a worker who has not punched yet', () => {
    expect(weekStats([], saturdayNoon)).toMatchObject({ minutes: 0, days: 0 });
  });

  it('reports how far into the week we are', () => {
    expect(weekStats([], saturdayNoon).elapsed).toBe(7); // Saturday is day seven
    // 2026-10-04T20:00Z is Monday 01:45 NPT — day two.
    expect(weekStats([], new Date('2026-10-04T20:00:00.000Z')).elapsed).toBe(2);
    // A Sunday is day one.
    expect(weekStats([], new Date('2026-09-27T06:15:00.000Z')).elapsed).toBe(1);
  });

  it('starts the week on Sunday in NPT even when the host runs UTC', () => {
    // 2026-10-05 is a Monday; the previous day (Sunday 2026-10-04) is the
    // week start. Host TZ must not matter: parts come from nepalParts.
    const mondayEarlyUtc = new Date('2026-10-04T20:00:00.000Z'); // Mon 01:45 NPT
    const rows = [{ date: '2026-10-04', workedMinutes: 400 }];
    const result = weekStats(rows, mondayEarlyUtc);
    expect(result.start).toBe('2026-10-04');
    expect(result.minutes).toBe(400);
  });
});

describe('lastWeekMinutes', () => {
  // Saturday noon NPT: the current week is 2026-10-04 → 2026-10-10, the
  // previous one 2026-09-27 → 2026-10-03.
  const saturdayNoon = new Date('2026-10-10T06:15:00.000Z');
  const rows = [
    { date: '2026-10-02', workedMinutes: 300 }, // Friday of last week
    { date: '2026-10-01', workedMinutes: 200 }, // Thursday
    { date: '2026-09-28', workedMinutes: 100 }, // Monday
    { date: '2026-09-27', workedMinutes: 50 }, // last week's Sunday — the guard row
    { date: '2026-10-05', workedMinutes: 480 }, // this week — never counted
  ];

  it('sums the whole previous week', () => {
    expect(lastWeekMinutes(rows, saturdayNoon)).toBe(650);
  });

  it('truncates to the days the current week has run', () => {
    // Two days into this week => only the Sunday and Monday of last week.
    expect(lastWeekMinutes(rows, saturdayNoon, 2)).toBe(150);
    // One day => the Sunday only.
    expect(lastWeekMinutes(rows, saturdayNoon, 1)).toBe(50);
    // The full week still compares as the full week.
    expect(lastWeekMinutes(rows, saturdayNoon, 7)).toBe(650);
  });

  it('returns null rather than comparing against a window it cannot see', () => {
    expect(lastWeekMinutes([{ date: '2026-10-05', workedMinutes: 120 }], saturdayNoon)).toBeNull();
    expect(lastWeekMinutes([], saturdayNoon, 1)).toBeNull();
  });
});
