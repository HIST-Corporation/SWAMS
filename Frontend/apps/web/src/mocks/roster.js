/**
 * The demo org's people — ONE place a person is defined (Section 8.8: realistic
 * Nepali fixtures, no lorem ipsum, no "John Doe").
 *
 * Every list that shows people derives from `ROSTER`: the team board, the
 * presence rows, the team directory, each staff persona's pod and the punch
 * reconciliation. One row here keeps two widgets on one screen from disagreeing
 * about who exists, what their initials are or which site they are at
 * (Section 7.6) — adding a colleague is one row, not five edits across
 * features. MOCK ONLY: labelled fixture data, never production behaviour.
 *
 * Two vocabularies describe the same person, on purpose: `presence` is what the
 * attendance board asks ("in / late / on leave / out") and `online` is what the
 * team directory asks ("reachable right now"). A person can be clocked in and
 * away from their desk, so collapsing the two into one field would make one of
 * the two screens lie.
 */

/** "Priya Sharma" → "PS". Derived so no fixture can drift from its name. */
export function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/**
 * `jobKey`  the title the shell prints (`nav.job.*`)
 * `roleKey` the title the team directory prints (`team.json` `roles.*`)
 * `dept`    the directory filter (`team.json` `departments.*`)
 */
export const ROSTER = [
  {
    id: 'u_aarav',
    name: 'Aarav Khadka',
    jobKey: 'ceo',
    roleKey: 'ceo',
    dept: 'executive',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 0,
  },
  {
    id: 'u_sarah',
    name: 'Sarah Mitchell',
    jobKey: 'hrManager',
    roleKey: 'hrManager',
    dept: 'hr',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 2,
  },
  {
    id: 'u_sita',
    name: 'Sita Shrestha',
    jobKey: 'hrOfficer',
    roleKey: 'hrOfficer',
    dept: 'hr',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 1,
  },
  {
    id: 'u_ramesh',
    name: 'Ramesh Adhikari',
    jobKey: 'engineeringManager',
    roleKey: 'engineeringManager',
    dept: 'engineering',
    site: 'Baneshwor',
    presence: 'in',
    online: 'busy',
    openTasks: 5,
  },
  {
    id: 'u_anita',
    name: 'Anita Thapa',
    jobKey: 'frontendLead',
    roleKey: 'frontendLead',
    dept: 'engineering',
    site: 'Lalitpur',
    presence: 'in',
    online: 'online',
    openTasks: 3,
  },
  {
    id: 'u_priya',
    name: 'Priya Sharma',
    jobKey: 'frontend',
    roleKey: 'frontendEngineer',
    dept: 'engineering',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 4,
  },
  {
    id: 'u_james',
    name: 'James Wilson',
    jobKey: 'backend',
    roleKey: 'backendEngineer',
    dept: 'engineering',
    site: 'Lalitpur',
    presence: 'in',
    online: 'online',
    openTasks: 6,
  },
  {
    id: 'u_prakash',
    name: 'Prakash Gurung',
    jobKey: 'backend',
    roleKey: 'backendEngineer',
    dept: 'engineering',
    site: 'Pokhara',
    presence: 'late',
    online: 'away',
    openTasks: 4,
  },
  {
    id: 'u_tina',
    name: 'Tina Nguyen',
    jobKey: 'qa',
    roleKey: 'qaEngineer',
    dept: 'engineering',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 3,
  },
  {
    id: 'u_sunita',
    name: 'Sunita Rai',
    jobKey: 'qa',
    roleKey: 'qaEngineer',
    dept: 'engineering',
    site: 'Baneshwor',
    presence: 'leave',
    online: 'offline',
    openTasks: 2,
  },
  {
    id: 'u_raj',
    name: 'Raj Kumar',
    jobKey: 'devops',
    roleKey: 'devopsEngineer',
    dept: 'engineering',
    site: 'Pokhara',
    presence: 'in',
    online: 'online',
    openTasks: 5,
  },
  {
    id: 'u_bibek',
    name: 'Bibek Karki',
    jobKey: 'devops',
    roleKey: 'devopsEngineer',
    dept: 'engineering',
    site: 'Lalitpur',
    presence: 'out',
    online: 'offline',
    openTasks: 2,
  },
  {
    id: 'u_aarati',
    name: 'Aarati Bhandari',
    jobKey: 'design',
    roleKey: 'productDesigner',
    dept: 'design',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 3,
  },
  {
    id: 'u_nabin',
    name: 'Nabin Shrestha',
    jobKey: 'marketing',
    roleKey: 'marketingLead',
    dept: 'marketing',
    site: 'Lalitpur',
    presence: 'in',
    online: 'away',
    openTasks: 2,
  },
  {
    id: 'u_kiran',
    name: 'Kiran Lama',
    jobKey: 'finance',
    roleKey: 'financeOfficer',
    dept: 'finance',
    site: 'Baneshwor',
    presence: 'in',
    online: 'online',
    openTasks: 1,
  },
  {
    id: 'u_anisha',
    name: 'Anisha Gurung',
    jobKey: 'support',
    roleKey: 'supportSpecialist',
    dept: 'support',
    site: 'Pokhara',
    presence: 'in',
    online: 'online',
    openTasks: 4,
  },
];

/**
 * One roster row with its initials resolved, or `null` for an unknown id.
 * Every fixture that names a person goes through here.
 * @param {string} id
 */
export function personById(id) {
  const person = ROSTER.find((row) => row.id === id);
  return person ? { ...person, initials: initialsOf(person.name) } : null;
}

/**
 * The demo staff accounts — one per prototype role card (`SWAMS_Unified.html`).
 * The email signs into that person, `staffRole` is what `GET /staff/board`
 * keys their work queue off (contract request 26), and `jobKey` is the title the
 * shell prints. `staff` stays the FE persona's session key because other
 * features' mocks and tests already use it.
 */
const PERSONA_ACCOUNTS = {
  staff: { id: 'u_priya', email: 'priya@swams.com', staffRole: 'fe' },
  be: { id: 'u_james', email: 'james@swams.com', staffRole: 'be' },
  qa: { id: 'u_tina', email: 'tina@swams.com', staffRole: 'qa' },
  devops: { id: 'u_raj', email: 'raj@swams.com', staffRole: 'devops' },
};

export const STAFF_PERSONAS = Object.fromEntries(
  Object.entries(PERSONA_ACCOUNTS).map(([key, account]) => {
    const person = personById(account.id);
    return [
      key,
      {
        key,
        id: account.id,
        name: person.name,
        initials: person.initials,
        email: account.email,
        jobKey: person.jobKey,
        staffRole: account.staffRole,
      },
    ];
  }),
);
