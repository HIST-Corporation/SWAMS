/**
 * Platform console fixtures — MOCK ONLY, labelled everywhere they render.
 * There is no platform backend yet (contract requests 30–31): these rows exist
 * so the console's shell, states and i18n can be exercised honestly, never to
 * pose as live tenants. Nepali SME names keep the fixtures in the product's
 * world (Section 8.8: realistic fixtures, no "Acme").
 */

/** Tenants the console would list. `status` maps to `console.status.*`. */
export const CONSOLE_ORGS = [
  {
    id: 'org_himal',
    name: 'Himal Digital Pvt. Ltd.',
    plan: 'Growth',
    seats: 42,
    status: 'active',
    created: '2025-01-12',
  },
  {
    id: 'org_annapurna',
    name: 'Annapurna Retail Pvt. Ltd.',
    plan: 'Growth',
    seats: 128,
    status: 'active',
    created: '2025-03-04',
  },
  {
    id: 'org_kathmanduCraft',
    name: 'Kathmandu Craft Cooperative',
    plan: 'Starter',
    seats: 17,
    status: 'trial',
    created: '2025-08-21',
  },
  {
    id: 'org_terai',
    name: 'Terai Agro Industries Ltd.',
    plan: 'Growth',
    seats: 210,
    status: 'active',
    created: '2024-11-02',
  },
  {
    id: 'org_lumbini',
    name: 'Lumbini Logistics Pvt. Ltd.',
    plan: 'Starter',
    seats: 23,
    status: 'suspended',
    created: '2025-05-17',
  },
  {
    id: 'org_everest',
    name: 'Everest Treks & Tours Pvt. Ltd.',
    plan: 'Starter',
    seats: 31,
    status: 'trial',
    created: '2025-09-30',
  },
];

/** Console accounts (platform administration — not org employees). */
export const CONSOLE_ADMINS = [
  {
    id: 'pa_1',
    name: 'Aashish Rana',
    email: 'admin@swams.com',
    level: 'owner',
    lastSeen: '2026-10-13',
  },
  {
    id: 'pa_2',
    name: 'Mingmar Sherpa',
    email: 'support@swams.com',
    level: 'support',
    lastSeen: '2026-10-11',
  },
];

/** Platform service health (sample). `status` maps to `console.health.*`. */
export const CONSOLE_HEALTH = [
  { id: 'svc_api', service: 'Public API', ok: true, uptime: '99.98%' },
  { id: 'svc_web', service: 'Workforce app (apps/web)', ok: true, uptime: '99.99%' },
  { id: 'svc_marketing', service: 'Marketing site', ok: true, uptime: '100%' },
  { id: 'svc_jobs', service: 'Notification jobs', ok: false, uptime: '97.42%' },
];

/** Derived counters for the overview tiles — computed once from the lists. */
export const PLATFORM_SUMMARY = Object.freeze({
  orgs: CONSOLE_ORGS.length,
  active: CONSOLE_ORGS.filter((org) => org.status === 'active').length,
  admins: CONSOLE_ADMINS.length,
  incidents: 1,
});
