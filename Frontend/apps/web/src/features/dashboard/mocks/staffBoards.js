import { personById } from '../../../mocks/fixtures.js';

/**
 * Staff role boards (MOCK ONLY) — the work queue each demo persona opens Home
 * on, served by `GET /staff/board` (contract request 26). Labelled fixture
 * data; never presented as production behaviour.
 *
 * The prototype (`SWAMS_Unified.html`, the staff login's four role cards) gives
 * every role its own board. If all four personas rendered the same personal
 * page, the login's promise — "each role is its own account" — would be a lie,
 * so each board carries that role's own queue and pod.
 *
 * Rules this file holds to:
 *  - `counts` is DERIVED from `queue`, so the header can never claim a number
 *    the list below it does not show (Section 7.6).
 *  - a pod member is a roster id, resolved through `personById`, so the name,
 *    initials and presence a persona's Home prints are the same ones the team
 *    board and the directory print.
 *  - `due` is a calendar date (`YYYY-MM-DD`), `null` when nothing is due yet —
 *    the client formats it and never invents one.
 */

/** ISO date (YYYY-MM-DD) for `daysAgo` days before today (UTC midnight). */
function isoDaysAgo(daysAgo) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const TODAY = isoDaysAgo(0);

/** Queue status → the count bucket the board's header prints. */
const COUNT_KEYS = { open: 'open', review: 'review', blocked: 'blocked', done: 'done' };

/**
 * Build one persona's board: attach `asOf`, resolve the pod and derive the
 * counts from the queue.
 * @param {{ queue: Array<object>, pod: string[] }} input
 */
function makeBoard({ queue, pod }) {
  const counts = Object.fromEntries(Object.keys(COUNT_KEYS).map((key) => [key, 0]));
  for (const item of queue) {
    const key = COUNT_KEYS[item.status];
    if (key) counts[key] += 1;
  }

  return {
    asOf: TODAY,
    counts,
    queue,
    pod: pod.map(personById).filter(Boolean),
  };
}

const BOARDS = {
  /** Frontend — the prototype's Priya. */
  fe: {
    pod: ['u_anita', 'u_ramesh', 'u_tina', 'u_sunita'],
    queue: [
      {
        id: 'q_fe_1',
        kind: 'review',
        status: 'review',
        priority: 'high',
        title: 'Review the punch-policy PR before the 2.4.1 cut',
        meta: 'swams-api #412',
        due: TODAY,
      },
      {
        id: 'q_fe_2',
        kind: 'bug',
        status: 'open',
        priority: 'high',
        title: 'Leave page nav breaks at 360px',
        meta: 'swams-web #380',
        due: TODAY,
      },
      {
        id: 'q_fe_3',
        kind: 'design',
        status: 'open',
        priority: 'medium',
        title: 'Token drift audit: chip tints in dark theme',
        meta: 'design-tokens',
        due: isoDaysAgo(-2),
      },
      {
        id: 'q_fe_4',
        kind: 'doc',
        status: 'open',
        priority: 'low',
        title: 'Write up the punch-card states for QA',
        meta: 'handoff note',
        due: isoDaysAgo(-4),
      },
      {
        id: 'q_fe_5',
        kind: 'deploy',
        status: 'blocked',
        priority: 'medium',
        title: 'Release 2.4.1 waiting on QA sign-off',
        meta: 'release/2.4.1',
        due: null,
      },
      {
        id: 'q_fe_6',
        kind: 'review',
        status: 'done',
        priority: 'low',
        title: "Reviewed Aarati's empty-state copy",
        meta: 'swams-web #377',
        due: isoDaysAgo(1),
      },
    ],
  },

  /** Backend — the prototype's James. */
  be: {
    pod: ['u_prakash', 'u_ramesh', 'u_bibek', 'u_tina'],
    queue: [
      {
        id: 'q_be_1',
        kind: 'bug',
        status: 'open',
        priority: 'high',
        title: 'Bulk CSV import returns 500 on a duplicate row',
        meta: 'swams-api #418',
        due: TODAY,
      },
      {
        id: 'q_be_2',
        kind: 'test',
        status: 'review',
        priority: 'high',
        title: 'Idempotency keys for POST /attendance/punch',
        meta: 'swams-api #409',
        due: TODAY,
      },
      {
        id: 'q_be_3',
        kind: 'ops',
        status: 'open',
        priority: 'medium',
        title: 'Index review for attendance_logs (slow month query)',
        meta: 'migration 0042',
        due: isoDaysAgo(-1),
      },
      {
        id: 'q_be_4',
        kind: 'review',
        status: 'blocked',
        priority: 'medium',
        title: 'Rate limiting on /auth/login needs the ops decision',
        meta: 'swams-api #401',
        due: null,
      },
      {
        id: 'q_be_5',
        kind: 'doc',
        status: 'done',
        priority: 'low',
        title: 'Documented the punch-error codes for the web app',
        meta: 'api-contract',
        due: isoDaysAgo(2),
      },
    ],
  },

  /** QA — the prototype's Tina. */
  qa: {
    pod: ['u_sunita', 'u_priya', 'u_anita', 'u_james'],
    queue: [
      {
        id: 'q_qa_1',
        kind: 'test',
        status: 'open',
        priority: 'high',
        title: 'Regression pass: punch offline queue and retry',
        meta: 'run sheet R2',
        due: TODAY,
      },
      {
        id: 'q_qa_2',
        kind: 'bug',
        status: 'open',
        priority: 'high',
        title: 'Three flaky specs on the correction queue',
        meta: 'swams-web e2e',
        due: TODAY,
      },
      {
        id: 'q_qa_3',
        kind: 'test',
        status: 'open',
        priority: 'medium',
        title: 'Dashain holiday rollover across the leave balance',
        meta: 'fiscal boundary',
        due: isoDaysAgo(-3),
      },
      {
        id: 'q_qa_4',
        kind: 'review',
        status: 'blocked',
        priority: 'medium',
        title: 'Sign-off for 2.4.1 held by the nav defect',
        meta: 'release/2.4.1',
        due: null,
      },
      {
        id: 'q_qa_5',
        kind: 'doc',
        status: 'done',
        priority: 'low',
        title: 'Wrote the device matrix for the punch flow',
        meta: 'test plan',
        due: isoDaysAgo(1),
      },
    ],
  },

  /** DevOps — the prototype's Raj. */
  devops: {
    pod: ['u_bibek', 'u_james', 'u_ramesh', 'u_prakash'],
    queue: [
      {
        id: 'q_do_1',
        kind: 'ops',
        status: 'open',
        priority: 'high',
        title: 'Rotate the staging database credentials',
        meta: 'quarterly rotation',
        due: TODAY,
      },
      {
        id: 'q_do_2',
        kind: 'deploy',
        status: 'open',
        priority: 'high',
        title: 'Dashain capacity plan for the API pool',
        meta: 'holiday cover',
        due: isoDaysAgo(-2),
      },
      {
        id: 'q_do_3',
        kind: 'ops',
        status: 'review',
        priority: 'medium',
        title: 'Tune the p95 latency alert (too noisy at night)',
        meta: 'monitoring',
        due: isoDaysAgo(-1),
      },
      {
        id: 'q_do_4',
        kind: 'deploy',
        status: 'blocked',
        priority: 'medium',
        title: 'CI runner upgrade to Node 22 waits on the vendor image',
        meta: 'runners',
        due: null,
      },
      {
        id: 'q_do_5',
        kind: 'doc',
        status: 'done',
        priority: 'low',
        title: 'Restore drill notes from the Friday test',
        meta: 'runbook',
        due: isoDaysAgo(3),
      },
    ],
  },
};

/**
 * `GET /staff/board` payloads, keyed by the session's `staffRole`. The mock
 * handler resolves the key from the SESSION, never from a query parameter, so
 * a persona cannot ask for someone else's board.
 */
export const STAFF_BOARDS = Object.fromEntries(
  Object.entries(BOARDS).map(([role, board]) => [role, makeBoard(board)]),
);
