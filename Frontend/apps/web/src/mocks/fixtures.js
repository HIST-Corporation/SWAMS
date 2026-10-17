/**
 * Realistic Nepali fixtures (Section 8.8). No lorem ipsum, no "John Doe",
 * no "Acme" — the sample org is Himal Digital Pvt. Ltd.
 *
 * Sign-in identities come from the owner's prototype (`SWAMS_Unified.html`):
 * `sarah@swams.com` (HR Manager) and the four staff personas behind its role
 * picker. The people themselves live in `./roster.js` — this file only describes
 * the sessions and org the auth mock issues. MOCK ONLY.
 */
import { ROSTER, STAFF_PERSONAS, personById } from './roster.js';

/** Fixture session for the HR demo account (Sarah Mitchell, HR Manager). */
function FIXTURES_HR() {
  const person = personById('u_sarah');
  return {
    user: {
      id: person.id,
      name: person.name,
      initials: person.initials,
      email: 'sarah@swams.com',
      locale: 'en',
      jobKey: person.jobKey,
    },
    principal: { id: person.id, role: 'hr' },
    entitlements: ['attendance', 'leave', 'tasks', 'calendar'],
    preferences: { theme: 'system', language: 'en', calendar: 'bs' },
    org: { id: 'org_himal', name: 'Himal Digital Pvt. Ltd.' },
  };
}

/** One staff session per persona (the same person as their roster row). */
function FIXTURES_STAFF(persona = STAFF_PERSONAS.staff) {
  return {
    user: {
      id: persona.id,
      name: persona.name,
      initials: persona.initials,
      email: persona.email,
      locale: 'en',
      jobKey: persona.jobKey,
      staffRole: persona.staffRole,
    },
    principal: { id: persona.id, role: 'staff' },
    entitlements: ['attendance', 'leave', 'tasks'],
    preferences: { theme: 'system', language: 'en', calendar: 'bs' },
    org: { id: 'org_himal', name: 'Himal Digital Pvt. Ltd.' },
  };
}

/**
 * A management session for a roster person (six-role model: executive, HR,
 * department manager, team lead). Same shape as every other session; only the
 * principal's role changes, and the role is what `can()` reads.
 */
function FIXTURES_MANAGEMENT(personId, role, email) {
  const person = personById(personId);
  return {
    user: {
      id: person.id,
      name: person.name,
      initials: person.initials,
      email,
      locale: 'en',
      jobKey: person.jobKey,
    },
    principal: { id: person.id, role },
    entitlements: ['attendance', 'leave', 'tasks', 'calendar'],
    preferences: { theme: 'system', language: 'en', calendar: 'bs' },
    org: { id: 'org_himal', name: 'Himal Digital Pvt. Ltd.' },
  };
}

export const FIXTURES = {
  org: {
    id: 'org_himal',
    name: 'Himal Digital Pvt. Ltd.',
    timezone: 'Asia/Kathmandu',
    fiscalYearStart: '07-16',
  },
  /** The session `/me` falls back to when no session key is set (HR). */
  session: FIXTURES_HR(),
  /**
   * Sessions the auth mock hands back per portal (slice 2). Mock data,
   * clearly labeled — never presented as production behavior.
   */
  sessions: {
    hr: FIXTURES_HR(),
    // Six-role model (docs/frontend/role-permission-matrix.md): the executive,
    // department manager and team lead are their own demo accounts. Platform
    // super_admin never signs into apps/web — it lives in apps/console only.
    ceo: FIXTURES_MANAGEMENT('u_aarav', 'owner', 'aarav@swams.com'),
    manager: FIXTURES_MANAGEMENT('u_ramesh', 'manager', 'ramesh@swams.com'),
    teamLead: FIXTURES_MANAGEMENT('u_anita', 'team_lead', 'anita@swams.com'),
    staff: FIXTURES_STAFF(),
    be: FIXTURES_STAFF(STAFF_PERSONAS.be),
    qa: FIXTURES_STAFF(STAFF_PERSONAS.qa),
    devops: FIXTURES_STAFF(STAFF_PERSONAS.devops),
  },
  /** The roster in the shape the presence strip reads (same ids, same people). */
  team: ROSTER.map(({ id, name, site, presence }) => ({ id, name, site, presence })),
};

export { ROSTER, STAFF_PERSONAS, initialsOf, personById } from './roster.js';
