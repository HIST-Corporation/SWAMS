import { describe, it, expect } from 'vitest';
import { evaluatePreflight } from './policy.js';

const site = { id: 's1', name: 'Baneshwor', lat: 27.6895, lng: 85.3415, radiusM: 150 };
const farAway = { lat: 27.6588, lng: 85.3247 };
const atSite = { lat: 27.6896, lng: 85.3416 };

/** The ids of the checks a result reports, in order. */
const checkIds = (result) => result.checks.map((check) => check.id);

describe('evaluatePreflight', () => {
  it('passes when the org policy does not require location', () => {
    const result = evaluatePreflight({ policy: { requiresLocation: false } });
    expect(result.decision).toBe('pass');
    expect(result.checks).toEqual([{ id: 'device', status: 'pass' }]);
  });

  it('treats a null policy as "cannot pre-check" rather than blocking', () => {
    expect(evaluatePreflight({ policy: null }).decision).toBe('pass');
  });

  it('blocks with a clear reason when the user denied location', () => {
    const result = evaluatePreflight({
      policy: { requiresLocation: true, allowOverride: true },
      permission: 'denied',
      location: null,
      site,
    });
    expect(result.decision).toBe('denied');
    expect(result.reason).toBe('location_denied');
    expect(result.allowOverride).toBe(true);
    // The device row is reported on the failure paths too, so the punch card
    // can say the phone is fine and the permission is the thing that failed.
    expect(checkIds(result)).toEqual(['device', 'location']);
    expect(result.checks.find((check) => check.id === 'device').status).toBe('pass');
    expect(result.checks.find((check) => check.id === 'location').status).toBe('denied');
  });

  it('marks an unsupported device as a failure the user can override', () => {
    const result = evaluatePreflight({
      policy: { requiresLocation: true, allowOverride: true },
      permission: 'unsupported',
      site,
    });
    expect(result.decision).toBe('fail');
    expect(result.reason).toBe('location_unsupported');
    expect(result.allowOverride).toBe(true);
    // "Unavailable" is the device's fault, and the rows must say which one.
    expect(checkIds(result)).toEqual(['device', 'location']);
    expect(result.checks.find((check) => check.id === 'location').status).toBe('unavailable');
  });

  it('passes inside the fence and reports the distance', () => {
    const result = evaluatePreflight({
      policy: { requiresLocation: true },
      permission: 'granted',
      location: atSite,
      site,
    });
    expect(result.decision).toBe('pass');
    expect(result.checks.find((c) => c.id === 'area').status).toBe('pass');
  });

  it('flags a reading outside the fence (saved for review, not blocked)', () => {
    const result = evaluatePreflight({
      policy: { requiresLocation: true },
      permission: 'granted',
      location: farAway,
      site,
    });
    expect(result.decision).toBe('fail');
    expect(result.reason).toBe('outside_area');
    expect(result.checks.find((c) => c.id === 'area').distanceM).toBeGreaterThan(150);
    // All three rows, in reading order: the note lists them one per line.
    expect(checkIds(result)).toEqual(['device', 'location', 'area']);
  });

  it('passes a reading when the site has no coordinates configured', () => {
    const result = evaluatePreflight({
      policy: { requiresLocation: true },
      permission: 'granted',
      location: atSite,
      site: { id: 's2', name: 'Pokhara' },
    });
    expect(result.decision).toBe('pass');
    expect(checkIds(result)).toEqual(['device', 'location']);
  });

  it('always reports the device row first, in every outcome', () => {
    // The punch card renders these rows in order and a person reads them as a
    // checklist; a missing or trailing "device" row reads as a second failure.
    const outcomes = [
      evaluatePreflight({ policy: { requiresLocation: false } }),
      evaluatePreflight({
        policy: { requiresLocation: true },
        permission: 'granted',
        location: atSite,
        site,
      }),
      evaluatePreflight({
        policy: { requiresLocation: true },
        permission: 'granted',
        location: farAway,
        site,
      }),
      evaluatePreflight({
        policy: { requiresLocation: true },
        permission: 'denied',
        location: null,
        site,
      }),
      evaluatePreflight({ policy: { requiresLocation: true }, permission: 'unsupported', site }),
    ];
    for (const result of outcomes) {
      expect(result.checks[0]).toEqual({ id: 'device', status: 'pass' });
      expect(new Set(result.checks.map((check) => check.id)).size).toBe(result.checks.length);
    }
  });
});
