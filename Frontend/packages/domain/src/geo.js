/**
 * Geofence math (Section 7.1 "location, area" checks). Pure, DOM-free, RN-safe.
 * The client pre-flight is advisory only — the server decides on the punch.
 */

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in metres between two {lat,lng} points (haversine).
 * @param {{lat:number,lng:number}} a @param {{lat:number,lng:number}} b
 * @returns {number} metres, rounded to the nearest metre
 */
export function distanceMeters(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * Is the reading inside the site's fence?
 * A policy without a radius is treated as "no fence configured" → true.
 * @param {{lat:number,lng:number}} reading
 * @param {{lat:number,lng:number,radiusM?:number}} site
 */
export function withinRadius(reading, site) {
  if (!site?.radiusM) return true;
  return distanceMeters(reading, site) <= site.radiusM;
}
