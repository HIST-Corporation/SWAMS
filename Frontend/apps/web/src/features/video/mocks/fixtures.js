/**
 * Video stage fixtures (MOCK ONLY). Sample participants (Himal Digital, §8.8)
 * and a sample transcript; the provider adapter and `GET /meetings/:id/token`
 * do not exist yet (screen inventory: provider = adapter ⚠️, R2 link / R3
 * native). No media permission is requested and no call is placed.
 */
export const PARTICIPANTS = [
  { id: 'u_sita', name: 'Sita Shrestha', initials: 'SS', you: true, speaking: false },
  { id: 'u_ramesh', name: 'Ramesh Adhikari', initials: 'RA', you: false, speaking: false },
  { id: 'u_anita', name: 'Anita Thapa', initials: 'AT', you: false, speaking: true },
  { id: 'u_prakash', name: 'Prakash Gurung', initials: 'PG', you: false, speaking: false },
];

export const IN_CALL_CHAT = [
  { id: 'c1', self: false, text: 'Let’s start with yesterday’s blockers.' },
  { id: 'c2', self: true, text: 'API rate limit is fixed.' },
];
