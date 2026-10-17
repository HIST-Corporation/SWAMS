/**
 * Notification fixtures (Section 8.8: realistic Nepali content, no lorem
 * ipsum). MOCK ONLY — labelled sample data, never presented as production
 * behavior. `audience` scopes a row to the mock portal that signed in, so the
 * bell reads plausibly for either portal; the field is stripped from responses.
 */

/** @param {number} minutes */
function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const NOTIFICATIONS = [
  {
    id: 'ntf_lv_req',
    audience: 'hr',
    kind: 'leave',
    key: 'leaveRequested',
    params: { name: 'Anita Thapa' },
    createdAt: minutesAgo(35),
    read: false,
    link: '/leave',
  },
  {
    id: 'ntf_ac_rev',
    audience: 'all',
    kind: 'attendance',
    key: 'correctionNeedsReview',
    params: {},
    createdAt: minutesAgo(95),
    read: false,
    link: '/attendance/corrections',
  },
  {
    id: 'ntf_mt_rem',
    audience: 'all',
    kind: 'meeting',
    key: 'meetingReminder',
    params: { title: 'Design sync' },
    createdAt: minutesAgo(12),
    read: false,
    link: '/meetings',
  },
  {
    id: 'ntf_lv_ok',
    audience: 'all',
    kind: 'leave',
    key: 'leaveApproved',
    params: {},
    createdAt: minutesAgo(1_500),
    read: true,
    link: '/leave',
  },
  {
    id: 'ntf_sy_pw',
    audience: 'all',
    kind: 'system',
    key: 'passwordChanged',
    params: {},
    createdAt: minutesAgo(2_900),
    read: true,
    link: null,
  },
];
