import { ROSTER } from '../../../mocks/roster.js';

/**
 * Conversation fixtures (MOCK ONLY). Himal Digital people — same ids as the
 * team directory so the two screens agree (§8.8). The real-time transport
 * (Socket.IO, contract request 10) does not exist yet; nothing here is a
 * delivered message.
 *
 * Availability rides on the roster's own `online` field, so the status dot
 * beside an avatar can never disagree with the directory or Team now about
 * whether Ramesh is online, busy, away or offline (§7.6).
 */

/**
 * Conversation seeds: the people you actually have a DM thread with. Only
 * these carry a sample thread + unread badge + last-message preview.
 */
const SEEDS = {
  u_ramesh: {
    unread: 2,
    lastMessage: 'Can we review the API contracts today?',
    lastTime: '10:24 AM',
  },
  u_anita: { unread: 0, lastMessage: 'Thanks for the feedback!', lastTime: 'Yesterday' },
  u_prakash: { unread: 1, lastMessage: 'Updated the schema', lastTime: 'Tue' },
  u_sunita: { unread: 0, lastMessage: 'All tests passing', lastTime: 'Mon' },
};

/**
 * Availability priority for the DM list: online first (top / toward the left),
 * then away, busy, do-not-disturb and offline — the order a teammate scans to
 * find someone reachable right now. An unknown value sorts last, never into
 * the online group, so a bad status can't pose as "available".
 */
export const AVAILABILITY_ORDER = ['online', 'away', 'busy', 'do_not_disturb', 'offline'];

/**
 * Order people so the most reachable appear first. Stable within a status, so
 * two online colleagues keep their roster order (Section 7.6 — one source of
 * truth for who exists). Non-mutating: returns a new array.
 * @param {Array<{status: string}>} people
 */
export function sortByAvailability(people) {
  const rank = (status) => {
    const index = AVAILABILITY_ORDER.indexOf(status);
    return index === -1 ? AVAILABILITY_ORDER.length : index;
  };
  return [...people].sort((a, b) => rank(a.status) - rank(b.status));
}

/**
 * Direct Messages: the people you have a conversation with (the SEEDS), not
 * the whole company. Each row's `status` still rides on the roster's own
 * `online` field, so the dot beside an avatar can never disagree with the
 * directory or Team about whether Ramesh is online, busy, away or offline
 * (§7.6). A blank last-message never happens here — every listed person has a
 * seed, so no preview is invented (§12.1).
 */
export const CONVERSATIONS = ROSTER.filter((person) => SEEDS[person.id]).map((person) => {
  const seed = SEEDS[person.id];
  return {
    id: person.id,
    name: person.name,
    roleKey: person.roleKey,
    status: person.online,
    unread: seed?.unread ?? 0,
    lastMessage: seed?.lastMessage ?? '',
    lastTime: seed?.lastTime ?? '',
  };
});

/**
 * The WHOLE company as conversation-shaped rows — everyone on the roster, not
 * just the people you already have a DM thread with. This is what the top
 * "Team" rail browses (§8.4): every colleague is one tap away, and clicking
 * someone with no thread yet opens an honest empty thread rather than a dead
 * control. Each row's `status` rides the roster's own `online` field, so the
 * dot can never disagree with the directory or Team about who is reachable
 * (§7.6). No `lastMessage` is invented here — a person with no seed simply has
 * none (§12.1).
 */
export const PEOPLE = ROSTER.map((person) => ({
  id: person.id,
  name: person.name,
  roleKey: person.roleKey,
  status: person.online,
}));

export const THREADS = {
  u_ramesh: [
    {
      id: 1,
      sender: 'u_ramesh',
      text: 'Hey Sita, are you free for a quick sync?',
      time: '10:12 AM',
      self: false,
    },
    { id: 2, sender: 'self', text: 'Sure, what do you need?', time: '10:13 AM', self: true },
    {
      id: 3,
      sender: 'u_ramesh',
      text: 'Can we review the API contracts today?',
      time: '10:24 AM',
      self: false,
    },
    { id: 4, sender: 'self', text: 'Yes — 3 PM works. I will send an invite.', time: '10:25 AM', self: true },
  ],
  u_anita: [
    {
      id: 1,
      sender: 'self',
      text: 'Pushed the header rework — mind a look?',
      time: '9:40 AM',
      self: true,
    },
    { id: 2, sender: 'u_anita', text: 'Thanks for the feedback!', time: 'Yesterday', self: false },
  ],
  u_prakash: [{ id: 1, sender: 'u_prakash', text: 'Updated the schema', time: 'Tue', self: false }],
  u_sunita: [{ id: 1, sender: 'u_sunita', text: 'All tests passing', time: 'Mon', self: false }],
};
