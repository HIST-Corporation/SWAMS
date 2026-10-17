import { describe, it, expect } from 'vitest';
import { distanceMeters, withinRadius } from './geo.js';

/** Baneshwor ↔ Lalitpur is roughly 3.6 km in real life; allow a loose band. */
const BANESHWOR = { lat: 27.6895, lng: 85.3415 };
const LALITPUR = { lat: 27.6588, lng: 85.3247 };

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(BANESHWOR, BANESHWOR)).toBe(0);
  });

  it('measures a realistic Kathmandu-valley distance', () => {
    const d = distanceMeters(BANESHWOR, LALITPUR);
    expect(d).toBeGreaterThan(3_000);
    expect(d).toBeLessThan(4_500);
  });

  it('returns Infinity when a point is missing rather than a wrong number', () => {
    expect(distanceMeters(null, LALITPUR)).toBe(Number.POSITIVE_INFINITY);
    expect(distanceMeters(BANESHWOR, undefined)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('withinRadius', () => {
  it('treats a site without a radius as unfenced', () => {
    expect(withinRadius(LALITPUR, BANESHWOR)).toBe(true);
  });

  it('accepts a reading inside the fence and rejects one outside', () => {
    const site = { ...BANESHWOR, radiusM: 150 };
    expect(withinRadius({ lat: 27.6896, lng: 85.3416 }, site)).toBe(true);
    expect(withinRadius(LALITPUR, site)).toBe(false);
  });
});
