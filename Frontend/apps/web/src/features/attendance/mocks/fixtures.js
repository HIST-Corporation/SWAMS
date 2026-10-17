/**
 * Attendance fixtures (mock). Realistic Nepali data per §8.8 — Himal Digital
 * Pvt. Ltd., Baneshwor/Lalitpur/Pokhara. Times are Nepal-time strings; the UI
 * formats them through packages/i18n. MOCK ONLY.
 */
import { nepalParts } from '@swams/i18n';
import { personById } from '../../../mocks/fixtures.js';

export const ATTENDANCE_POLICY = {
  /** Looked up by policy id, not copied into the UI — labels come from i18n. */
  requiresLocation: true,
  allowOverride: false,
  workdayMinutes: 480,
  sites: [
    {
      id: 'site_baneshwor',
      name: 'Baneshwor',
      lat: 27.6895,
      lng: 85.3415,
      radiusM: 150,
    },
    {
      id: 'site_lalitpur',
      name: 'Lalitpur',
      lat: 27.6588,
      lng: 85.3247,
      radiusM: 120,
    },
    {
      id: 'site_pokhara',
      name: 'Pokhara',
      lat: 28.2096,
      lng: 83.9856,
      radiusM: 200,
    },
  ],
};

/** Today's open session for the signed-in staff fixture (Priya Sharma). */
export const TODAY_OPEN = {
  session: {
    id: 'punch_today_in',
    startedAt: '2026-10-09T03:17:00.000Z', // 09:02 NPT
    site: 'Baneshwor',
    lastPunch: { id: 'punch_today_in', kind: 'in', at: '2026-10-09T03:17:00.000Z' },
  },
  site: { id: 'site_baneshwor', name: 'Baneshwor' },
  schedule: { expectedMinutes: 480, shift: 'General 09:00–17:30', start: '09:00', end: '17:30' },
};

/** Today with nothing punched yet — the new-day / empty state. */
export const TODAY_EMPTY = {
  session: null,
  site: { id: 'site_baneshwor', name: 'Baneshwor' },
  schedule: { expectedMinutes: 480, shift: 'General 09:00–17:30', start: '09:00', end: '17:30' },
};

/**
 * 14 days of history, deterministic (offset from a fixed date) so snapshots and
 * tests never flake. `status` uses ids the UI translates; `exceptions` are what
 * a manager would act on.
 */
const HISTORY_TEMPLATE = [
  { minutes: 486, status: 'present', in: '09:02', out: '17:18' },
  { minutes: 480, status: 'present', in: '09:00', out: '17:10' },
  { minutes: 462, status: 'present', in: '09:11', out: '16:53' },
  { minutes: 0, status: 'holiday', in: null, out: null },
  { minutes: 495, status: 'present', in: '08:58', out: '17:33' },
  { minutes: 372, status: 'late', in: '09:38', out: '16:20' },
  { minutes: 0, status: 'leave', in: null, out: null },
  { minutes: 480, status: 'present', in: '09:04', out: '17:12' },
  { minutes: 470, status: 'present', in: '09:06', out: '16:56' },
  { minutes: 0, status: 'absent', in: null, out: null },
  { minutes: 508, status: 'present', in: '08:52', out: '17:40' },
  { minutes: 480, status: 'present', in: '09:01', out: '17:11' },
  { minutes: 0, status: 'holiday', in: null, out: null },
  { minutes: 426, status: 'half_day', in: '09:00', out: '13:06' },
];

/**
 * The mock server's idea of "today", in the same Nepal wall-clock arithmetic
 * `weekStats` uses, so the Home week chart and the history rows can never
 * disagree about which day is which.
 *
 * It deliberately moves with the real clock: a stand-in for
 * `GET /attendance/history` that served a frozen date would make every
 * week-to-date widget render empty. The 14-day offset pattern is still fixed,
 * so the data stays deterministic in shape — tests derive the anchor from
 * here instead of hard-coding one.
 */
export function mockTodayIso() {
  const { year, month, day } = nepalParts(new Date());
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** ISO date (YYYY-MM-DD) for `daysAgo` days before `mockTodayIso()`. */
function isoDaysAgo(daysAgo) {
  const d = new Date(`${mockTodayIso()}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Today's board for a manager/HR lens (R2): who is in, who is late, what is
 * missing. Presence ids are translated by the UI, never rendered raw.
 *
 * The people come from the shared roster (`src/mocks/roster.js`) — this board
 * is the reviewer's own team of eight, so a name, an initial or a site can
 * never differ from what the directory and the presence strip print for the
 * same id (Section 7.6).
 */
const TEAM_TODAY = {
  u_ramesh: { presence: 'in', clockIn: '09:07', workedMinutes: 481 },
  u_anita: { presence: 'in', clockIn: '09:11', workedMinutes: 477 },
  u_priya: { presence: 'in', clockIn: '09:02', workedMinutes: 486 },
  u_james: { presence: 'in', clockIn: '09:14', workedMinutes: 474 },
  u_tina: { presence: 'in', clockIn: '08:56', workedMinutes: 492 },
  u_prakash: {
    presence: 'late',
    clockIn: '09:46',
    workedMinutes: 442,
    exception: 'late_arrival',
  },
  u_sunita: { presence: 'leave', clockIn: null, workedMinutes: 0, exception: null },
  u_bibek: { presence: 'out', clockIn: null, workedMinutes: 0, exception: 'no_punch' },
};

/** One board row: roster identity + today's own facts. */
function teamRow(id) {
  const person = personById(id);
  return { id, name: person.name, initials: person.initials, site: person.site, ...TEAM_TODAY[id] };
}

/**
 * The counts above the board. Derived HERE, from the rows the server sends, so
 * the summary can never disagree with the list (Section 7.6: the client never
 * recomputes it — the payload states it).
 * @param {Array<object>} rows
 */
export function summariseTeam(rows) {
  const count = (presence) => rows.filter((row) => row.presence === presence).length;
  return {
    present: count('in'),
    late: count('late'),
    onLeave: count('leave'),
    notIn: count('out'),
    expected: rows.length,
  };
}

const TEAM_ROWS = Object.keys(TEAM_TODAY).map(teamRow);

export const TEAM_BOARD = {
  summary: summariseTeam(TEAM_ROWS),
  rows: TEAM_ROWS,
};

/**
 * Two seeded requests so both sides of §7.5 have something to render on a
 * fresh mock session (fixtures, not real data): one waiting for a reviewer
 * (the manager bench) and one already answered by the signed-in staff fixture
 * ("my requests", including the reviewer's note).
 */
export function seedCorrections() {
  return [
    {
      id: 'corr_seed_1',
      requester: 'Prakash Gurung',
      date: '2026-10-04',
      original: { id: 'punch_seed_1', clockIn: '09:38', clockOut: '16:20', date: '2026-10-04' },
      proposed: { clockIn: '09:02', clockOut: '16:20' },
      reason: 'Bus strike in Pokhara — the punch registered late at the gate.',
      status: 'in_review',
      note: null,
      createdAt: '2026-10-04T11:00:00.000Z',
    },
    {
      id: 'corr_seed_2',
      requester: 'Priya Sharma',
      date: '2026-10-01',
      original: { id: 'punch_seed_2', clockIn: null, clockOut: '17:11', date: '2026-10-01' },
      proposed: { clockIn: '09:01', clockOut: '17:11' },
      reason: 'The gate reader was down when I arrived.',
      status: 'approved',
      note: 'Checked against the site log.',
      createdAt: '2026-10-01T12:10:00.000Z',
    },
  ];
}

/** @returns {Array<object>} newest first */
export function attendanceHistory() {
  return HISTORY_TEMPLATE.map((row, index) => ({
    id: `att_${index + 1}`,
    date: isoDaysAgo(index),
    clockIn: row.in,
    clockOut: row.out,
    workedMinutes: row.minutes,
    status: row.status,
    exception: row.status === 'late' ? 'late_arrival' : row.status === 'absent' ? 'no_punch' : null,
    correction: null,
  }));
}
