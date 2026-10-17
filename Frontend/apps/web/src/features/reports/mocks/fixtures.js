import { businessDays, isIsoDate } from '../utils/range.js';

/**
 * Report fixtures (Section 8.8: realistic Nepali org, no lorem ipsum).
 * MOCK ONLY — labelled sample data, never presented as production behavior.
 *
 * The JSON endpoint and the CSV endpoint derive from ONE function
 * (`deriveReport`), so the export can never disagree with the table on
 * screen. Numbers are deterministic per (type, from, to): each member's
 * fixed rates scale with the business days in the range, which lets the
 * filters feel real without inventing per-day randomness.
 */

export const REPORT_TYPES = ['attendance', 'leave', 'tasks'];

/** Columns per report type, in CSV/table order (machine keys, never localized). */
export const REPORT_COLUMNS = {
  attendance: ['employee', 'present', 'late', 'absent', 'onLeave', 'workedMinutes'],
  leave: ['employee', 'annual', 'sick', 'unpaid', 'special', 'totalDays'],
  tasks: ['employee', 'done', 'open', 'overdue'],
};

const TEAM = [
  {
    name: 'Sita Shrestha',
    present: 0.88,
    late: 0.06,
    onLeave: 0.04,
    annual: 0.05,
    sick: 0.01,
    unpaid: 0,
    special: 0.01,
    done: 0.7,
    open: 0.2,
    overdue: 0.04,
  },
  {
    name: 'Ramesh Adhikari',
    present: 0.82,
    late: 0.1,
    onLeave: 0.06,
    annual: 0.04,
    sick: 0.02,
    unpaid: 0.01,
    special: 0.01,
    done: 0.6,
    open: 0.25,
    overdue: 0.06,
  },
  {
    name: 'Anita Thapa',
    present: 0.9,
    late: 0.04,
    onLeave: 0.04,
    annual: 0.03,
    sick: 0.01,
    unpaid: 0,
    special: 0,
    done: 0.75,
    open: 0.15,
    overdue: 0.02,
  },
  {
    name: 'Prakash Gurung',
    present: 0.76,
    late: 0.14,
    onLeave: 0.08,
    annual: 0.05,
    sick: 0.02,
    unpaid: 0.02,
    special: 0.01,
    done: 0.5,
    open: 0.3,
    overdue: 0.08,
  },
  {
    name: 'Sunita Rai',
    present: 0.86,
    late: 0.05,
    onLeave: 0.07,
    annual: 0.04,
    sick: 0.02,
    unpaid: 0,
    special: 0.01,
    done: 0.65,
    open: 0.2,
    overdue: 0.03,
  },
];

const WORKDAY_MINUTES = 480;

/** @param {number} value */
const round = (value) => Math.round(value);

function attendanceRow(member, days) {
  const present = round(days * member.present);
  const late = round(days * member.late);
  const onLeave = round(days * member.onLeave);
  const absent = Math.max(0, days - present - late - onLeave);
  return {
    employee: member.name,
    present,
    late,
    absent,
    onLeave,
    workedMinutes: present * WORKDAY_MINUTES + late * (WORKDAY_MINUTES - 30),
  };
}

function leaveRow(member, days) {
  const annual = round(days * member.annual);
  const sick = round(days * member.sick);
  const unpaid = round(days * member.unpaid);
  const special = round(days * member.special);
  return {
    employee: member.name,
    annual,
    sick,
    unpaid,
    special,
    totalDays: annual + sick + unpaid + special,
  };
}

function tasksRow(member, days) {
  const done = round(days * member.done);
  const open = round(days * member.open);
  const overdue = round(days * member.overdue);
  return { employee: member.name, done, open, overdue };
}

/**
 * Derive one report. Deterministic for a given (type, from, to).
 * @param {'attendance'|'leave'|'tasks'} type
 * @param {string} from `YYYY-MM-DD`
 * @param {string} to `YYYY-MM-DD`
 * @returns {{type: string, from: string, to: string, rows: object[], summary: object}}
 */
export function deriveReport(type, from, to) {
  const days = businessDays(from, to);
  const build = { attendance: attendanceRow, leave: leaveRow, tasks: tasksRow }[type];
  const rows = TEAM.map((member) => build(member, days));

  const numeric = rows.reduce((acc, row) => {
    for (const [key, value] of Object.entries(row)) {
      if (key !== 'employee') acc[key] = (acc[key] ?? 0) + value;
    }
    return acc;
  }, {});

  return { type, from, to, rows, summary: { headcount: rows.length, ...numeric } };
}

/** ISO date the mock accepts for a range bound. */
export const isValidBound = isIsoDate;
