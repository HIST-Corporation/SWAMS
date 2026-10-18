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
import { AppError, unauthorized, forbidden } from '../../common/errors.js';
import { scopeFor } from '../../middleware/scope.js';
import { requireRole } from '../../middleware/auth.js';
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

/** ========================================================================
 *  Role-specific dashboards — each role gets the structure relevant to its
 *  responsibilities. Staff section is untouched (/staff/board stays as-is).
 * ======================================================================== */

/** GET /dashboard/hr — HR action queue: leave/corrections pending, exceptions. */
router.get(
  '/dashboard/hr',
  requireRole('hr'),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const today = nepalToday();
    const [pendingLeave, pendingCorrections, onLeaveToday, recentActivity] =
      await Promise.all([
        prisma.leaveRequest.findMany({
          where: { orgId, status: 'pending' },
          include: { requester: { select: { id: true, name: true, initials: true, departmentId: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.attendanceCorrection.findMany({
          where: { orgId, status: 'in_review' },
          include: { requester: { select: { id: true, name: true, initials: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.leaveRequest.findMany({
          where: { orgId, status: 'approved', from: { lte: today }, to: { gte: today } },
          include: { requester: { select: { id: true, name: true, initials: true } } },
          orderBy: { requester: { name: 'asc' } },
        }),
        prisma.auditLog.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);
    return res.json({
      asOf: today,
      scope: 'organization',
      actionQueue: {
        pendingLeave: pendingLeave.map((l) => ({
          id: l.id,
          kind: 'leave',
          title: l.requester.name + ' — leave request',
          status: l.status,
          requester: { id: l.requester.id, name: l.requester.name, initials: l.requester.initials },
          createdAt: l.createdAt,
        })),
        pendingCorrections: pendingCorrections.map((c) => ({
          id: c.id,
          kind: 'correction',
          title: 'Attendance correction — ' + c.requester.name,
          status: c.status,
          requester: { id: c.requester.id, name: c.requester.name, initials: c.requester.initials },
          createdAt: c.createdAt,
        })),
      },
      presence: {
        onLeaveToday: onLeaveToday.map((l) => ({
          id: l.id,
          name: l.requester.name,
          initials: l.requester.initials,
        })),
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        actor: a.actorName ?? 'System',
        createdAt: a.createdAt,
      })),
    });
  }),
);

/** GET /dashboard/manager — Department capacity vs load, risks, approvals. */
router.get(
  '/dashboard/manager',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const { orgId, departmentId } = req.principal;
    const today = nepalToday();
    if (!departmentId) {
      throw new AppError('out_of_scope', 'Manager has no department assigned.', { httpStatus: 403 });
    }
    const [deptMembers, todaysSessions, pendingLeave, pendingCorrections] =
      await Promise.all([
        prisma.user.findMany({
          where: { orgId, departmentId, active: true },
          select: { id: true, name: true, initials: true, role: true },
        }),
        prisma.attendanceSession.findMany({ where: { orgId, date: today } }),
        prisma.leaveRequest.findMany({
          where: { orgId, status: 'pending' },
          include: { requester: { select: { id: true, name: true, initials: true, departmentId: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.attendanceCorrection.findMany({
          where: { orgId, status: 'in_review' },
          include: { requester: { select: { id: true, name: true, initials: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);
    const memberIds = new Set(deptMembers.map((m) => m.id));
    const deptSessions = todaysSessions.filter((s) => memberIds.has(s.userId));
    const present = deptSessions.filter((s) => s.clockIn && !s.clockOut).length;
    const late = deptSessions.filter((s) => s.status === 'late').length;
    const onLeave = pendingLeave.filter((l) => memberIds.has(l.requesterId)).length;
    return res.json({
      asOf: today,
      scope: 'department',
      department: {
        id: departmentId,
        headcount: deptMembers.length,
        present,
        late,
        onLeave,
        absent: Math.max(0, deptMembers.length - present - late - onLeave),
        rate: deptMembers.length > 0 ? Math.round(((present + late) / deptMembers.length) * 1000) / 10 : 0,
      },
      approvals: {
        pendingLeave: pendingLeave.filter((l) => memberIds.has(l.requesterId)).map((l) => ({
          id: l.id,
          requester: { id: l.requester.id, name: l.requester.name, initials: l.requester.initials },
          createdAt: l.createdAt,
        })),
        pendingCorrections: pendingCorrections.filter((c) => memberIds.has(c.requesterId)).map((c) => ({
          id: c.id,
          requester: { id: c.requester.id, name: c.requester.name, initials: c.requester.initials },
          createdAt: c.createdAt,
        })),
      },
      risks: [],
    });
  }),
);

/** GET /dashboard/team-lead — Team workload, blockers, corrections queue. */
router.get(
  '/dashboard/team-lead',
  requireRole('team_lead'),
  asyncHandler(async (req, res) => {
    const { orgId, teamIds } = req.principal;
    const today = nepalToday();
    if (!teamIds?.length) {
      throw new AppError('out_of_scope', 'Team lead has no team assigned.', { httpStatus: 403 });
    }
    // Team members first: the task query below needs their ids.
    const teamMembers = await prisma.user.findMany({
      where: {
        orgId,
        active: true,
        memberTeams: { some: { id: { in: teamIds } } },
      },
      select: { id: true, name: true, initials: true, role: true, departmentId: true },
    });
    const memberIds = teamMembers.map((m) => m.id);
    const memberIdSet = new Set(memberIds);
    const [todaysSessions, pendingCorrections, tasks] = await Promise.all([
      prisma.attendanceSession.findMany({ where: { orgId, date: today } }),
      prisma.attendanceCorrection.findMany({
        where: { orgId, status: 'in_review' },
        include: { requester: { select: { id: true, name: true, initials: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.findMany({
        where: {
          orgId,
          OR: [{ assigneeId: { in: memberIds } }, { reviewerId: { in: memberIds } }],
          closedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);
    const present = todaysSessions.filter((s) => memberIdSet.has(s.userId) && s.clockIn && !s.clockOut).length;
    const onLeaveCorrections = pendingCorrections.filter((c) => memberIdSet.has(c.requesterId));
    return res.json({
      asOf: today,
      scope: 'team',
      team: {
        headcount: teamMembers.length,
        present,
        absent: teamMembers.length - present,
        onLeave: onLeaveCorrections.length,
      },
      workload: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        lane: t.lane,
        assigneeId: t.assigneeId,
        reviewerId: t.reviewerId,
        due: t.due,
      })),
      corrections: onLeaveCorrections.map((c) => ({
        id: c.id,
        requester: { id: c.requester.id, name: c.requester.name, initials: c.requester.initials },
        status: c.status,
        createdAt: c.createdAt,
      })),
      blockers: tasks.filter((t) => t.lane === 'review' || t.lane === 'revision').map((t) => ({
        id: t.id,
        title: t.title,
        lane: t.lane,
        assigneeId: t.assigneeId,
      })),
    });
  }),
);

/** GET /dashboard/owner — Org-wide aggregates, headcount, approvals inbox. */
router.get(
  '/dashboard/owner',
  requireRole('owner'),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const today = nepalToday();
    const [headcount, sessions, pendingLeave, pendingCorrections] =
      await Promise.all([
        prisma.user.count({ where: { orgId, active: true } }),
        prisma.attendanceSession.findMany({ where: { orgId, date: today } }),
        prisma.leaveRequest.count({ where: { orgId, status: 'pending' } }),
        prisma.attendanceCorrection.count({ where: { orgId, status: 'in_review' } }),
      ]);
    const onSite = sessions.filter((s) => s.clockIn && !s.clockOut).length;
    // Org headcount by department — the owner panel's "by department" list.
    const [departments, headcounts] = await Promise.all([
      prisma.department.findMany({
        where: { orgId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.groupBy({
        by: ['departmentId'],
        where: { orgId, active: true },
        _count: { _all: true },
      }),
    ]);
    const countByDept = new Map(headcounts.map((row) => [row.departmentId, row._count._all]));
    return res.json({
      asOf: today,
      scope: 'organization',
      org: {
        headcount,
        onSite,
        pendingLeave,
        pendingCorrections,
        rate: headcount > 0 ? Math.round((onSite / headcount) * 1000) / 10 : 0,
      },
      departments: departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        headcount: countByDept.get(dept.id) ?? 0,
      })),
      approvals: { pendingLeave, pendingCorrections },
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
