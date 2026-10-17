import { distanceMeters, withinRadius } from '@swams/domain';

/**
 * Punch pre-flight (§7.1 "checking"): what the *device* can tell us before the
 * request. The result is advisory UX only — `POST /attendance/punch` is the
 * authority and may still save the punch as `needsReview`.
 *
 * @param {object} input
 * @param {{requiresLocation?: boolean, allowOverride?: boolean, sites?: object[]}|null} input.policy
 * @param {{lat:number,lng:number}|null} [input.location]
 * @param {'granted'|'denied'|'unsupported'|null} [input.permission]
 * @param {{id?:string,name?:string,lat?:number,lng?:number,radiusM?:number}|null} [input.site]
 * @returns {{decision:'pass'|'fail'|'denied', checks: object[], allowOverride: boolean, reason?: string, distanceM?: number}}
 */
export function evaluatePreflight({ policy, location, permission, site } = {}) {
  // The device row is the one check every path can report on, so it is always
  // first. Without this the failure states listed only "Location", and a person
  // could not tell whether their phone had failed or their position had — the
  // reason §7.1 asks for a reason at all.
  const device = { id: 'device', status: 'pass' };
  const withDevice = (checks) => [device, ...checks];

  if (!policy?.requiresLocation) {
    return { decision: 'pass', checks: withDevice([]), allowOverride: false };
  }

  if (permission === 'unsupported') {
    return {
      decision: 'fail',
      checks: withDevice([{ id: 'location', status: 'unavailable' }]),
      allowOverride: policy.allowOverride === true,
      reason: 'location_unsupported',
    };
  }

  if (permission === 'denied' || !location) {
    return {
      decision: 'denied',
      checks: withDevice([{ id: 'location', status: 'denied' }]),
      allowOverride: policy.allowOverride === true,
      reason: 'location_denied',
    };
  }

  if (!site?.lat || !site?.lng) {
    // No fence configured for the site: the reading is enough.
    return {
      decision: 'pass',
      checks: withDevice([{ id: 'location', status: 'pass' }]),
      allowOverride: false,
    };
  }

  const distanceM = distanceMeters(location, site);
  const inside = withinRadius(location, site);
  return {
    decision: inside ? 'pass' : 'fail',
    checks: withDevice([
      { id: 'location', status: 'pass' },
      { id: 'area', status: inside ? 'pass' : 'fail', distanceM, radiusM: site.radiusM },
    ]),
    allowOverride: policy.allowOverride === true,
    reason: inside ? undefined : 'outside_area',
    distanceM,
  };
}

/**
 * Read the device location for the pre-flight. Resolves `null` instead of
 * throwing so a denied/absent geolocation never blocks the punch screen; the
 * policy decides what that means. Requires a secure context.
 * @param {{timeoutMs?: number}} [options]
 * @returns {Promise<{location: {lat:number,lng:number}|null, permission: 'granted'|'denied'|'unsupported'|null}>}
 */
export async function readLocation({ timeoutMs = 8_000 } = {}) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { location: null, permission: 'unsupported' };
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    navigator.geolocation.getCurrentPosition(
      (position) =>
        done({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          permission: 'granted',
        }),
      (error) => done({ location: null, permission: error?.code === 1 ? 'denied' : 'unsupported' }),
      { timeout: timeoutMs, maximumAge: 60_000, enableHighAccuracy: false },
    );
  });
}
