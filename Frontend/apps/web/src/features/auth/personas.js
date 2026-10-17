import { Briefcase, Bug, Cloud, Code, Crown, Server, ShieldHalf, Users } from 'lucide-react';

/**
 * The login persona cards — one entry per demo account the management and
 * staff portals offer (six-role model; the platform super_admin lives in
 * apps/console and never signs in here). The i18n key maps double as the
 * email lookup: the mock decides the session from the address alone
 * (`features/auth/mocks/handlers.js`), so a card works by filling that address.
 */

/** Management portal: Executive (CEO), HR Manager, Dept. Manager, Team Lead. */
export const MANAGEMENT_PERSONAS = [
  { value: 'ceo', labelKey: 'auth.personaExecutive', Icon: Crown, emailKey: 'auth.demoCeoEmail' },
  {
    value: 'hr',
    labelKey: 'auth.personaHrManager',
    Icon: ShieldHalf,
    emailKey: 'auth.demoHrEmail',
  },
  {
    value: 'manager',
    labelKey: 'auth.personaDeptManager',
    Icon: Briefcase,
    emailKey: 'auth.demoManagerEmail',
  },
  {
    value: 'teamLead',
    labelKey: 'auth.personaTeamLead',
    Icon: Users,
    emailKey: 'auth.demoTeamLeadEmail',
  },
];

/** Staff portal: the prototype's four staff role cards. */
export const STAFF_PERSONA_CARDS = [
  { value: 'staff', labelKey: 'auth.personaFrontend', Icon: Code, emailKey: 'auth.demoStaffEmail' },
  { value: 'be', labelKey: 'auth.personaBackend', Icon: Server, emailKey: 'auth.demoBeEmail' },
  { value: 'qa', labelKey: 'auth.personaQa', Icon: Bug, emailKey: 'auth.demoQaEmail' },
  {
    value: 'devops',
    labelKey: 'auth.personaDevops',
    Icon: Cloud,
    emailKey: 'auth.demoDevopsEmail',
  },
];

/** @param {'hr'|'staff'} portal */
export const personasFor = (portal) =>
  portal === 'hr' ? MANAGEMENT_PERSONAS : STAFF_PERSONA_CARDS;

/** The i18n key of the demo email for a portal/persona pair. */
export function demoEmailKey(portal, persona) {
  const card = personasFor(portal).find((entry) => entry.value === persona);
  return card?.emailKey ?? (portal === 'hr' ? 'auth.demoHrEmail' : 'auth.demoStaffEmail');
}

/** Every demo email key (both portals), for "is this address a demo one?". */
export const ALL_DEMO_EMAIL_KEYS = Object.freeze(
  [...MANAGEMENT_PERSONAS, ...STAFF_PERSONA_CARDS].map((card) => card.emailKey),
);
