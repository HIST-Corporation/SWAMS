// @ts-check
/**
 * Dashboard module — presence strip, org overview/dashboard, upcoming events
 * and the staff board (contract rows 12–15, 25, 26, 30). The org dashboard is
 * scope-aware: staff → 403 out_of_scope, team_lead → team, manager →
 * department, hr/owner → organization.
 */
import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../common/errors.js';
import { scopeFor } from '../../middleware/scope.js';
import { nepalToday, nepalTime, nepalDaysAgo } from '../../common/time.js';

const router = Router();

/** Today's presence for the Home strip — everyone in the session's scope. */
async function presenceRows(principal) {
  const { orgId } = principal;
  const date = nepalToday();
  const scope = scopeFor(principal);
  const peopleWhere = { orgId, active: true };
  if (scope === 'self') {
    peopleWhere.id = principal.userId;
  } else if (scope === 'team' && principal.teamIds?.length) {
    peopleWhere.OR = [
      { memberTeams: { some: { id: { in: principal.teamIds } } } },
      { leadingTeams: { some: { id: { in: principal.teamIds } } } },
    ];
  } else if (scope === 'department' && principal.departmentId) {
    peopleWhere.departmentId = principal.departmentId;
  }
  const [people, sessions, leaves] = await Promise.all([
    prisma.user.findMany({
      where: peopleWhere,
      select: { id: true, name: true, initials: true, site: true, lastSeenAt: true },
      orderBy: { name: 'asc' },
    }),
    prisma.attendanceSession.findMany({ where: { orgId, date } }),
    prisma.leaveRequest.findMany({
      where: { orgId, status: 'approved', from: { lte: date }, to: { gte: date } },
      select: { requesterId: true },
    }),
  ]);
  const sessionByUser = new Map(sessions.map((s) => [s.userId, s]));
  const onLeave = new Set(leaves.map((l) => l.requesterId));
  const staleAfter = Date.now() - 15 * 60_000;
  return people.map((person) => {
    const session = sessionByUser.get(person.id);
    let presence = 'out';
    if (onLeave.has(person.id)) presence = 'leave';
    else if (session?.clockIn && !session.clockOut) presence = session.status === 'late' ? 'late' : 'in';
    const online =
      person.lastSeenAt && person.lastSeenAt.getTime() > staleAfter ? 'online' : 'offline';
    return { id: person.id, name: person.name, initials: person.initials, site: person.site, presence, online };
  });
}

/** GET /presence — the "Team now" strip. */
router.get(
  '/presence',
  asyncHandler(async (req, res) => {
    return res.json({ rows: await presenceRows(req.principal) });
  }),
);

/** GET /org/overview — the Home hero's counters. */
router.get(
  '/org/overview',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const date = nepalToday();
    const [headcount, sessions, pending] = await Promise.all([
      prisma.user.count({ where: { orgId, active: true } }),
      prisma.attendanceSession.findMany({ where: { orgId, date }, select: { clockIn: true, clockOut: true } }),
      prisma.attendanceCorrection.count({ where: { orgId, status: 'in_review' } }),
    ]);
    const onSite = sessions.filter((s) => s.clockIn && !s.clockOut).length;
    return res.json({ headcount, onSite, pending });
  }),
);

/** The audience a reviewer may compose a dashboard for. */
function dashboardScopeWhere(principal) {
  const scope = scopeFor(principal);
  const base = { orgId: principal.orgId, active: true };
  if (scope === 'platform' || scope === 'organization') return { scope, where: base };
  if (scope === 'department' && principal.departmentId) {
    return { scope, where: { ...base, departmentId: principal.departmentId } };
  }
  if (scope === 'team' && principal.teamIds?.length) {
    return {
      scope,
      where: {
        ...base,
        OR: [
          { memberTeams: { some: { id: { in: principal.teamIds } } } },
          { leadingTeams: { some: { id: { in: principal.teamIds } } } },
        ],
      },
    };
  }
  // Staff have no org board — refuse rather than silently serve one person.
  return { scope, where: null };
}

/** GET /org/dashboard — the whole-company (scoped) board (contract rows 25/30). */
router.get(
  '/org/dashboard',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const { scope, where } = dashboardScopeWhere(req.principal);
    if (!where) {
      throw new AppError('out_of_scope', 'The org dashboard is outside your data scope.', {
        httpStatus: 403,
      });
    }
    const today = nepalToday();
    const [people, todaysSessions, pendingLeave, pendingCorrections, departments] =
      await Promise.all([
        prisma.user.findMany({ where, select: { id: true, departmentId: true } }),
        prisma.attendanceSession.findMany({ where: { orgId, date: today } }),
        prisma.leaveRequest.count({ where: { orgId, status: 'pending' } }),
        prisma.attendanceCorrection.count({ where: { orgId, status: 'in_review' } }),
        prisma.department.findMany({ where: { orgId }, select: { id: true, name: true } }),
      ]);
    const trendSessions = await prisma.attendanceSession.findMany({
      where: {
        orgId,
        date: { gte: nepalDaysAgo(7), lte: today },
        userId: { in: people.map((p) => p.id) },
      },
    });

    const peopleIds = new Set(people.map((p) => p.id));
    const sessionByUser = new Map(todaysSessions.map((s) => [s.userId, s]));
    let present = 0;
    let late = 0;
    let notIn = 0;
    for (const person of people) {
      const session = sessionByUser.get(person.id);
      if (session?.status === 'late') late += 1;
      else if (session?.clockIn) present += 1;
      else notIn += 1;
    }
    const leaveRows = await prisma.leaveRequest.findMany({
      where: { orgId, status: 'approved', from: { lte: today }, to: { gte: today } },
      select: { requesterId: true },
    });
    const onLeave = leaveRows.filter((l) => peopleIds.has(l.requesterId)).length;
    notIn = Math.max(0, notIn - onLeave);

    const headcount = people.length;
    const presentTotal = present + late;
    const rate = headcount > 0 ? Math.round((presentTotal / headcount) * 1000) / 10 : 0;

    const trendPoints = [];
    for (let i = 7; i >= 0; i -= 1) {
      const date = nepalDaysAgo(i);
      const dayRows = trendSessions.filter((s) => s.date === date);
      const dayRate =
        headcount > 0
          ? Math.round((dayRows.filter((s) => s.clockIn).length / headcount) * 1000) / 10
          : 0;
      trendPoints.push({ date, rate: i === 0 ? rate : dayRate });
    }

    const tones = ['indigo', 'violet', 'teal', 'marigold', 'rose'];
    const deptRates = departments.map((dept, index) => {
      const ids = people.filter((p) => p.departmentId === dept.id).map((p) => p.id);
      const deptSessions = todaysSessions.filter((s) => ids.includes(s.userId));
      const deptRate =
        ids.length > 0 ? Math.round((deptSessions.filter((s) => s.clockIn).length / ids.length) * 1000) / 10 : 0;
      return { id: dept.id, name: dept.name, rate: deptRate, tone: tones[index % tones.length] };
    });

    const meetings = await prisma.calendarEvent.findMany({
      where: { orgId, date: today, kind: 'meeting' },
      orderBy: { createdAt: 'asc' },
    });
    const delta = trendPoints.length >= 2 ? Math.round((rate - trendPoints[0].rate) * 10) / 10 : 0;

    return res.json({
      asOf: today,
      scope,
      kpi: {
        present: presentTotal,
        rate,
        headcount,
        headcountDelta: 0,
        onLeave,
        pendingLeave,
        absent: notIn,
        unexcused: pendingCorrections,
      },
      presence: { present, late, onLeave, notIn, expected: headcount },
      trend: { target: 85, points: trendPoints },
      departments: deptRates,
      benchmarks: [
        {
          id: 'bm_rate',
          metric: 'attendanceRate',
          swams: rate,
          industry: 85,
          unit: 'percent',
          status: rate >= 85 ? 'better' : 'low',
          delta: Math.round((rate - 85) * 10) / 10,
        },
      ],
      insights: [
        {
          id: 'ins_trend',
          kind: 'trend',
          titleKey: 'insight.trend.title',
          bodyKey: 'insight.trend.body',
          params: { delta, rate: deptRates[0]?.rate ?? rate, team: deptRates[0]?.name ?? '—' },
        },
        {
          id: 'ins_predict',
          kind: 'predict',
          titleKey: 'insight.predict.title',
          bodyKey: 'insight.predict.body',
          params: { count: pendingCorrections },
        },
      ],
      meetings: meetings.map((m) => ({
        id: m.id,
        time: nepalTime(m.createdAt) ?? '09:00',
        title: m.title,
        audience: m.audience ?? 'All',
        tone: 'indigo',
      })),
    });
  }),
);

/** GET /events/upcoming — the Home rail (meetings, leave, holidays). */
router.get(
  '/events/upcoming',
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const today = nepalToday();
    const soon = nepalDaysAgo(-7);
    const [events, holidays, leaves] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { orgId, date: { gte: today, lte: soon } },
        orderBy: { date: 'asc' },
        take: 10,
      }),
      prisma.holiday.findMany({
        where: { orgId, date: { gte: today, lte: soon } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
      prisma.leaveRequest.findMany({
        where: { orgId, status: 'approved', from: { gte: today }, to: { lte: soon } },
        include: { requester: { select: { name: true } } },
        orderBy: { from: 'asc' },
        take: 5,
      }),
    ]);
    const rows = [];
    for (const event of events) {
      rows.push({
        id: event.id,
        kind: event.kind,
        title: event.title,
        when: event.audience ?? null,
        date: event.date,
      });
    }
    for (const leave of leaves) {
      rows.push({
        id: `lv_${leave.id}`,
        kind: 'leave',
        title: `${leave.requester?.name ?? 'Colleague'} on leave`,
        when: null,
        date: leave.from,
      });
    }
    for (const holiday of holidays) {
      rows.push({ id: holiday.id, kind: 'holiday', title: holiday.title, when: null, date: holiday.date });
    }
    rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return res.json({ rows });
  }),
);

/** GET /staff/board — the persona's own work queue (contract row 26). */
router.get(
  '/staff/board',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    if (!req.principal.staffRole) {
      throw new AppError('not_a_staff_board', 'The staff board belongs to a staff session.', {
        httpStatus: 403,
      });
    }
    const [tasks, team] = await Promise.all([
      prisma.task.findMany({
        where: { orgId, OR: [{ assigneeId: userId }, { reviewerId: userId }], closedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.user.findMany({
        where: {
          orgId,
          active: true,
          id: { not: userId },
          OR: [
            { memberTeams: { some: { members: { some: { id: userId } } } } },
            { leadingTeams: { some: { id: userId } } },
            { memberTeams: { some: { leadId: userId } } },
          ],
        },
        select: { id: true, name: true, initials: true, site: true, lastSeenAt: true },
        take: 8,
      }),
    ]);

    const statusOf = (lane) =>
      lane === 'done' ? 'done' : lane === 'review' ? 'review' : lane === 'revision' ? 'blocked' : 'open';
    const queue = tasks.map((task) => ({
      id: task.id,
      kind: task.kind,
      status: statusOf(task.lane),
      priority: task.priority,
      title: task.title,
      meta: task.meta ?? '',
      due: task.due ?? null,
    }));
    const counts = { open: 0, review: 0, blocked: 0, done: 0 };
    for (const item of queue) counts[item.status] += 1;

    const staleAfter = Date.now() - 15 * 60_000;
    return res.json({
      asOf: nepalToday(),
      counts,
      queue,
      pod: team.map((person) => ({
        id: person.id,
        name: person.name,
        initials: person.initials,
        site: person.site,
        presence: 'out',
        online: person.lastSeenAt && person.lastSeenAt.getTime() > staleAfter ? 'online' : 'offline',
      })),
    });
  }),
);



export default router;
