// @ts-check
/**
 * Reports module — attendance/leave/task reports with CSV export and the
 * period analytics screen (contract rows 21 and 28). One derivation feeds
 * both the JSON and CSV endpoints, so the export can never disagree with the
 * table on screen. Scope-aware: rows follow the session's data scope.
 */
import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../common/errors.js';
import { scopeFor } from '../../middleware/scope.js';
import { nepalToday, nepalDaysAgo } from '../../common/time.js';

const router = Router();
const REPORT_TYPES = ['attendance', 'leave', 'tasks'];
const PERIODS = ['week', 'month', 'year'];
const isIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));

const REPORT_COLUMNS = {
  attendance: ['employee', 'present', 'late', 'absent', 'onLeave', 'workedMinutes'],
  leave: ['employee', 'annual', 'sick', 'unpaid', 'special', 'totalDays'],
  tasks: ['employee', 'done', 'open', 'overdue'],
};

/** Default window: the last 30 days (the client's fallback). */
function defaultBounds() {
  const to = nepalToday();
  return { from: nepalDaysAgo(29), to };
}

/** Resolve the people in this session's data scope. */
async function scopedPeople(principal) {
  const { orgId } = principal;
  const scope = scopeFor(principal);
  const where = { orgId, active: true };
  if (scope === 'self') {
    where.id = principal.userId;
  } else if (scope === 'team' && principal.teamIds?.length) {
    where.OR = [
      { memberTeams: { some: { id: { in: principal.teamIds } } } },
      { leadingTeams: { some: { id: { in: principal.teamIds } } } },
    ];
  } else if (scope === 'department' && principal.departmentId) {
    where.departmentId = principal.departmentId;
  }
  return prisma.user.findMany({
    where,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

/** Derive the report rows for one type from the underlying rows. */
async function deriveReport(principal, type, from, to) {
  const { orgId } = principal;
  const people = await scopedPeople(principal);
  const ids = people.map((p) => p.id);

  if (type === 'attendance') {
    const sessions = await prisma.attendanceSession.findMany({
      where: { orgId, userId: { in: ids }, date: { gte: from, lte: to } },
    });
    const rows = people.map((person) => {
      const mine = sessions.filter((s) => s.userId === person.id);
      const present = mine.filter((s) => s.status === 'present').length;
      const late = mine.filter((s) => s.status === 'late').length;
      const onLeave = mine.filter((s) => s.status === 'leave').length;
      const absent = mine.filter((s) => s.status === 'absent').length;
      return {
        employee: person.name,
        present,
        late,
        absent,
        onLeave,
        workedMinutes: mine.reduce((sum, s) => sum + (s.workedMinutes ?? 0), 0),
      };
    });
    return { type, from, to, rows, summary: summarise(rows, ['present', 'late', 'absent', 'onLeave', 'workedMinutes']) };
  }

  if (type === 'leave') {
    const requests = await prisma.leaveRequest.findMany({
      where: { orgId, requesterId: { in: ids }, status: 'approved', from: { gte: from, lte: to } },
    });
    const rows = people.map((person) => {
      const mine = requests.filter((r) => r.requesterId === person.id);
      const sum = (key) => mine.filter((r) => r.typeKey === key).reduce((s, r) => s + r.days, 0);
      const annual = sum('annual');
      const sick = sum('sick');
      const unpaid = sum('unpaid');
      const special = sum('special');
      return { employee: person.name, annual, sick, unpaid, special, totalDays: annual + sick + unpaid + special };
    });
    return { type, from, to, rows, summary: summarise(rows, ['annual', 'sick', 'unpaid', 'special', 'totalDays']) };
  }

  const tasks = await prisma.task.findMany({
    where: { orgId, assigneeId: { in: ids }, createdAt: { gte: new Date(`${from}T00:00:00+05:45`) } },
  });
  const today = nepalToday();
  const rows = people.map((person) => {
    const mine = tasks.filter((t) => t.assigneeId === person.id);
    return {
      employee: person.name,
      done: mine.filter((t) => t.closedAt || t.lane === 'done').length,
      open: mine.filter((t) => !t.closedAt && t.lane !== 'done').length,
      overdue: mine.filter((t) => !t.closedAt && t.due && t.due < today).length,
    };
  });
  return { type, from, to, rows, summary: summarise(rows, ['done', 'open', 'overdue']) };
}

/** Sum numeric columns + headcount into the shared summary shape. */
function summarise(rows, columns) {
  const numeric = {};
  for (const column of columns) {
    numeric[column] = rows.reduce((sum, row) => sum + (row[column] ?? 0), 0);
  }
  return { headcount: rows.length, ...numeric };
}

/** Shared query validation — one answer for JSON, CSV and analytics. */
function readParams(query) {
  const type = query.type;
  if (!REPORT_TYPES.includes(type)) {
    throw new AppError('invalid_type', 'Type must be attendance, leave or tasks.', { httpStatus: 422 });
  }
  const fallback = defaultBounds();
  const from = query.from || fallback.from;
  const to = query.to || fallback.to;
  if (!isIso(from) || !isIso(to)) {
    throw new AppError('invalid_date', 'Dates must be YYYY-MM-DD.', { httpStatus: 422 });
  }
  if (from > to) {
    throw new AppError('invalid_range', 'The start date must be on or before the end date.', {
      httpStatus: 422,
    });
  }
  return { type, from, to };
}

/** RFC-4180 quoting; the header row uses machine keys, never localized text. */
function toCsv(type, report) {
  const columns = REPORT_COLUMNS[type];
  const escape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [columns.join(',')];
  for (const row of report.rows) {
    lines.push(columns.map((column) => escape(row[column])).join(','));
  }
  return lines.join('\r\n');
}

/** GET /reports?type=attendance|leave|tasks&from&to (contract row 21). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, from, to } = readParams(req.query);
    const report = await deriveReport(req.principal, type, from, to);
    return res.json(report);
  }),
);

/** GET /reports.csv — the same rows, exported. */
router.get(
  '/csv',
  asyncHandler(async (req, res) => {
    const { type, from, to } = readParams(req.query);
    const report = await deriveReport(req.principal, type, from, to);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="swams-${type}-${from}_${to}.csv"`,
    );
    return res.send(toCsv(type, report));
  }),
);

/**
 * GET /reports/analytics?period=week|month|year (contract row 28).
 * Series, summary and breakdown all derive from the same session rows, so
 * the screen can never disagree with itself.
 */
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const period = req.query.period;
    if (!PERIODS.includes(period)) {
      throw new AppError('invalid_period', 'Period must be week, month or year.', { httpStatus: 422 });
    }
    const { orgId } = req.principal;
    const spanDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const from = nepalDaysAgo(spanDays - 1);
    const to = nepalToday();
    const people = await scopedPeople(req.principal);
    const ids = people.map((p) => p.id);
    const sessions = await prisma.attendanceSession.findMany({
      where: { orgId, userId: { in: ids }, date: { gte: from, lte: to } },
    });

    const byDate = new Map();
    for (const session of sessions) {
      if (!byDate.has(session.date)) byDate.set(session.date, []);
      byDate.get(session.date).push(session);
    }
    // One point per day in the window (empty days render as 0, not missing).
    const points = [];
    for (let i = spanDays - 1; i >= 0; i -= 1) {
      const date = nepalDaysAgo(i);
      const rows = byDate.get(date) ?? [];
      const minutes = rows.reduce((sum, s) => sum + (s.workedMinutes ?? 0), 0);
      const rate = people.length > 0 ? Math.round((rows.filter((s) => s.clockIn).length / people.length) * 1000) / 10 : 0;
      points.push({ date, rate, minutes });
    }

    const breakdown = {
      present: sessions.filter((s) => s.status === 'present').length,
      late: sessions.filter((s) => s.status === 'late').length,
      absent: sessions.filter((s) => s.status === 'absent').length,
      leave: sessions.filter((s) => s.status === 'leave').length,
    };
    const workedMinutes = sessions.reduce((sum, s) => sum + (s.workedMinutes ?? 0), 0);
    const presentDays = breakdown.present + breakdown.late;
    const rate =
      sessions.length + (people.length * spanDays - sessions.length) > 0
        ? Math.round(
            (presentDays / Math.max(1, people.length * spanDays)) * 1000,
          ) / 10
        : 0;

    return res.json({
      period,
      points,
      summary: {
        rate,
        workedMinutes,
        presentDays,
        lateDays: breakdown.late,
      },
      breakdown,
    });
  }),
);


export default router;
