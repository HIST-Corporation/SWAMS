/**
 * Audit fixtures (Section 8.8: realistic Nepali org activity, no lorem ipsum).
 * MOCK ONLY — labelled sample data, never presented as production behavior.
 * These are read-only consequences of prototype actions (leave approved,
 * role changed) that the sliced features never actually logged server-side.
 */

/** @param {number} minutes */
function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const AUDIT_ENTRIES = [
  {
    id: 'aud_01',
    actor: 'Sita Shrestha',
    entity: 'leave',
    action: 'leaveApproved',
    createdAt: minutesAgo(40),
  },
  {
    id: 'aud_02',
    actor: 'Ramesh Adhikari',
    entity: 'attendance',
    action: 'correctionApproved',
    createdAt: minutesAgo(120),
  },
  {
    id: 'aud_03',
    actor: 'Sita Shrestha',
    entity: 'team',
    action: 'userInvited',
    createdAt: minutesAgo(300),
  },
  {
    id: 'aud_04',
    actor: 'Anita Thapa',
    entity: 'security',
    action: 'passwordChanged',
    createdAt: minutesAgo(700),
  },
  {
    id: 'aud_05',
    actor: 'Sita Shrestha',
    entity: 'leave',
    action: 'leaveRejected',
    createdAt: minutesAgo(1_500),
  },
  {
    id: 'aud_06',
    actor: 'Ramesh Adhikari',
    entity: 'team',
    action: 'roleChanged',
    createdAt: minutesAgo(1_700),
  },
  {
    id: 'aud_07',
    actor: 'Sita Shrestha',
    entity: 'settings',
    action: 'profileUpdated',
    createdAt: minutesAgo(2_900),
  },
  {
    id: 'aud_08',
    actor: 'Ramesh Adhikari',
    entity: 'team',
    action: 'userDeactivated',
    createdAt: minutesAgo(4_400),
  },
  {
    id: 'aud_09',
    actor: 'Sita Shrestha',
    entity: 'leave',
    action: 'leaveApproved',
    createdAt: minutesAgo(5_800),
  },
  {
    id: 'aud_10',
    actor: 'Ramesh Adhikari',
    entity: 'attendance',
    action: 'correctionApproved',
    createdAt: minutesAgo(8_600),
  },
  {
    id: 'aud_11',
    actor: 'Anita Thapa',
    entity: 'settings',
    action: 'profileUpdated',
    createdAt: minutesAgo(10_100),
  },
  {
    id: 'aud_12',
    actor: 'Sita Shrestha',
    entity: 'team',
    action: 'roleChanged',
    createdAt: minutesAgo(14_300),
  },
];
