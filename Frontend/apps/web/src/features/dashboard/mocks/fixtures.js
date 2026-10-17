/**
 * Dashboard fixtures (MOCK ONLY). Realistic Nepali data per §8.8 — Himal
 * Digital Pvt. Ltd. Served by `handlers.js` until the real endpoints land
 * (contract requests 12–15, 25 and 26 in docs/api-contract/contract-requests.md).
 * Never presented as production behavior.
 *
 * NOTE: `GET /tasks?due=today` lives in the tasks feature's mock store since
 * slice 8 (one store for Home + board); the fixture below was removed with it.
 *
 * TWO SCOPES, ON PURPOSE. `PRESENCE` names the people we have names for — the
 * shared roster (15 of them) behind staff Home's "Team now" strip — while
 * `ORG_OVERVIEW` and `ORG_DASHBOARD` carry the whole-company figures the
 * owner's prototype printed (142 people). `GET /attendance/team` is a third,
 * narrower scope: the reviewer's own team (8 people). No screen mixes them:
 * the reviewer's composition reads `ORG_DASHBOARD` only, and "Team now" never
 * claims to be the company.
 *
 * The people themselves come from ONE roster (`src/mocks/roster.js`), so the
 * presence strip, the team board and the directory always name the same human
 * with the same initials (Section 7.6).
 */
import { ROSTER, initialsOf } from '../../../mocks/fixtures.js';

/** ISO date (YYYY-MM-DD) for `daysAgo` days before today (UTC midnight). */
function isoDaysAgo(daysAgo) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Annual leave balance for the staff fixture — 15 days entitled, 2 used,
 * 1 pending (a request in review), 12 remaining. Numbers a payroll system
 * would own; the UI never computes entitlements itself (Section 7.6).
 */
export const LEAVE_BALANCE = {
  rows: [{ type: 'annual', entitled: 15, used: 2, pending: 1, remaining: 12 }],
};

/**
 * The whole office's presence for Home's "Team now" strip — every roster
 * person, so a demo team reads like an office rather than three avatars. The
 * attendance team board below is a different scope (the reviewer's own team of
 * eight), derived from the same roster, so the two can never name a person
 * differently.
 */
export const PRESENCE = {
  rows: ROSTER.map(({ id, name, site, presence, online }) => ({
    id,
    name,
    initials: initialsOf(name),
    site,
    presence,
    online,
  })),
};

/**
 * Org-wide counters for the Home hero's big numbers. `headcount` and `onSite`
 * are whole-company (the reviewer's org board), `pending` mirrors the
 * correction queue so the two never disagree.
 */
export const ORG_OVERVIEW = {
  headcount: 142,
  onSite: 127,
  pending: 2,
};

/**
 * Upcoming events for the Home rail — meetings, leave and holidays for the
 * next few days. Typed so the rail can tint each row by kind; dates are AD
 * ISO strings, rendered with the app's date formatter (BS when it lands).
 */
export const UPCOMING = {
  rows: [
    { id: 'ev_1', kind: 'meeting', title: 'Weekly standup', when: '10:30', date: null },
    { id: 'ev_2', kind: 'leave', title: 'Prakash on leave', when: null, date: isoDaysAgo(-1) },
    { id: 'ev_3', kind: 'holiday', title: 'Dashain begins', when: null, date: isoDaysAgo(-8) },
  ],
};

/** The eight daily attendance rates behind the trend chart, oldest first. */
const TREND_RATES = [84, 87, 88, 86, 91, 85, 88, 89.4];

/**
 * Org dashboard (`GET /org/dashboard`, contract request 25) — the whole-company
 * board behind the reviewer's composed Home.
 *
 * Every figure is one the prototype's dashboard showed (`SWAMS_Unified.html`,
 * `#page-dashboard`). ONE payload owns the KPI row, the donut, the trend, the
 * departments, the benchmarks, the insights and today's meetings, so two
 * sections of one screen can never state different numbers. The invariants the
 * contract test pins down:
 *
 *   kpi.present  = presence.present + presence.late   (127 = 124 + 3)
 *   kpi.headcount = presence.expected                  (142)
 *   kpi.present + kpi.onLeave + kpi.absent = headcount (127 + 8 + 7 = 142)
 *   trend.points.at(-1).rate = kpi.rate                (89.4, today's point)
 *   departments[0].rate = the rate the trend insight quotes (96)
 *
 * `insights` and `meetings` are the two blocks with no endpoint behind them at
 * all: their copy is named by i18n key, so the sentence a reader sees is ours
 * and the numbers in it are the server's (Section 8.9).
 */
export const ORG_DASHBOARD = {
  asOf: isoDaysAgo(0),
  kpi: {
    present: 127,
    rate: 89.4,
    headcount: 142,
    headcountDelta: 4,
    onLeave: 8,
    pendingLeave: 2,
    absent: 7,
    unexcused: 3,
  },
  presence: { present: 124, late: 3, onLeave: 8, notIn: 7, expected: 142 },
  trend: {
    target: 85,
    points: TREND_RATES.map((rate, i) => ({ date: isoDaysAgo(TREND_RATES.length - 1 - i), rate })),
  },
  departments: [
    { id: 'dept_eng', name: 'Engineering', rate: 96, tone: 'indigo' },
    { id: 'dept_design', name: 'Design', rate: 91, tone: 'violet' },
    { id: 'dept_hr', name: 'HR', rate: 88, tone: 'teal' },
    { id: 'dept_marketing', name: 'Marketing', rate: 84, tone: 'marigold' },
    { id: 'dept_finance', name: 'Finance', rate: 79, tone: 'rose' },
  ],
  benchmarks: [
    {
      id: 'bm_rate',
      metric: 'attendanceRate',
      swams: 89.4,
      industry: 85,
      unit: 'percent',
      status: 'better',
      delta: 4.4,
    },
    {
      id: 'bm_late',
      metric: 'lateArrivals',
      swams: 3.2,
      industry: 5.1,
      unit: 'perMonth',
      status: 'better',
    },
    { id: 'bm_leave', metric: 'leaveUse', swams: 68, industry: 74, unit: 'percent', status: 'low' },
    {
      id: 'bm_overtime',
      metric: 'overtime',
      swams: 8.4,
      industry: 6.2,
      unit: 'perWeek',
      status: 'high',
    },
  ],
  insights: [
    {
      id: 'ins_predict',
      kind: 'predict',
      titleKey: 'insight.predict.title',
      bodyKey: 'insight.predict.body',
      params: { count: 3 },
    },
    {
      id: 'ins_trend',
      kind: 'trend',
      titleKey: 'insight.trend.title',
      bodyKey: 'insight.trend.body',
      params: { delta: 4.2, rate: 96, team: 'Engineering' },
    },
    {
      id: 'ins_burnout',
      kind: 'risk',
      titleKey: 'insight.burnout.title',
      bodyKey: 'insight.burnout.body',
      params: { count: 2 },
    },
  ],
  meetings: [
    {
      id: 'mt_standup',
      time: '09:00',
      title: 'Weekly standup',
      audience: 'Engineering',
      tone: 'indigo',
    },
    {
      id: 'mt_policy',
      time: '11:30',
      title: 'HR policy review',
      audience: 'All department heads',
      tone: 'violet',
    },
    {
      id: 'mt_planning',
      time: '14:00',
      title: 'Q2 planning',
      audience: 'Leadership',
      tone: 'teal',
    },
  ],
};
