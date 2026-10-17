import { describe, it, expect } from 'vitest';
import {
  toDevanagariDigits,
  groupAmount,
  formatMoney,
  formatDuration,
  formatClock,
  formatPercent,
  nepalParts,
} from './formatters.js';
import { resources } from './i18n.js';
import enCommon from '../locales/en/common.json';
import neCommon from '../locales/ne/common.json';
import enNav from '../locales/en/nav.json';
import neNav from '../locales/ne/nav.json';

describe('groupAmount (lakh/crore)', () => {
  it('groups into lakh style (Section 8.8)', () => {
    expect(groupAmount(125000)).toBe('1,25,000');
    expect(groupAmount(12500000)).toBe('1,25,00,000');
    expect(groupAmount(999)).toBe('999');
    expect(groupAmount(1000)).toBe('1,000');
  });

  it('keeps negatives and fractions', () => {
    expect(groupAmount(-125000)).toBe('-1,25,000');
    expect(groupAmount(1250.5)).toBe('1,250.5');
  });
});

describe('formatMoney', () => {
  it('renders the Section 8.8 sample for ne', () => {
    expect(formatMoney(125000, { locale: 'ne' })).toBe('रू 1,25,000');
    expect(formatMoney(125000, { locale: 'ne', devanagariDigits: true })).toBe('रू १,२५,०००');
  });

  it('renders NPR for en', () => {
    expect(formatMoney(125000)).toBe('NPR 1,25,000');
  });
});

describe('devanagari digits', () => {
  it('maps 0-9', () => {
    expect(toDevanagariDigits('09:02')).toBe('०९:०२');
  });
});

describe('formatDuration', () => {
  it('formats the Staff Home wireframe values', () => {
    expect(formatDuration(258)).toBe('4h 18m');
    expect(formatDuration(1900)).toBe('31h 40m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(120)).toBe('2h');
  });
});

describe('formatPercent', () => {
  it('drops a trailing zero and keeps one decimal otherwise', () => {
    expect(formatPercent(89.4)).toBe('89.4%');
    expect(formatPercent(85)).toBe('85%');
    expect(formatPercent(50.25, { digits: 2 })).toBe('50.25%');
  });
});

describe('Nepal time (UTC+05:45)', () => {
  it('shifts UTC to Nepal wall clock', () => {
    const utcNoon = new Date('2026-08-28T12:00:00Z');
    expect(nepalParts(utcNoon)).toMatchObject({ day: 28, hours: 17, minutes: 45 });
    expect(formatClock(utcNoon)).toBe('17:45');
    expect(formatClock(utcNoon, { hour12: true })).toBe('5:45 PM');
  });

  it('crosses midnight into the next Nepali day', () => {
    const late = new Date('2026-08-28T18:40:00Z'); // 00:25 next day in Nepal
    expect(nepalParts(late)).toMatchObject({ day: 29, hours: 0, minutes: 25 });
  });
});

describe('catalogs', () => {
  it('en and ne share the same keys (deep)', () => {
    const flatten = (obj, prefix = '') =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    for (const ns of [
      [enCommon, neCommon],
      [enNav, neNav],
    ]) {
      expect(flatten(ns[1]).sort()).toEqual(flatten(ns[0]).sort());
    }
  });

  it('exposes both languages', () => {
    expect(Object.keys(resources).sort()).toEqual(['en', 'ne']);
  });
});
