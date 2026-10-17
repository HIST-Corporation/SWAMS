// @ts-check
/**
 * Attendance module — punch with idempotency, today's session, history,
 * month calendar, team board and the corrections queue (contract rows 2, 3,
 * 24, 27, 30). All "today" arithmetic is Nepal wall-clock (common/time.js).
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { validate } from '../../common/validate.js';
import { prisma } from '../../db/prisma.js';
import { AppError, conflict } from '../../common/errors.js';
import { parsePaging } from '../../common/http.js';
import { audit } from '../../middleware/audit.js';
import { idempotency } from '../../middleware/idempotency.js';
import { scopeFor } from '../../middleware/scope.js';
import { nepalToday, nepalTime, minutesBetween, weekdayOf, daysInMonth } from '../../common/time.js';

const router = Router();

/** Live policy for the org (contract row 2: policy results). */
async function policyFor(orgId) {
  const [org, sites, shift] = await Promise.all([
    prisma.org.findUnique({ where: { id: orgId } }),
    prisma.site.findMany({ where: { orgId }, orderBy: { name: 'asc' } }),
    prisma.shift.findFirst({ where: { orgId } }),
  ]);
  return {
    requiresLocation: org?.requiresLocation ?? true,
    allowOverride: org?.allowOverride ?? false,
    workdayMinutes: shift?.workdayMinutes ?? 480,
    shift: shift
      ? { id: shift.id, name: shift.name, start: shift.startTime, end: shift.endTime }
      : { id: null, name: 'General', start: '09:00', end: '17:30' },
    sites: sites.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, radiusM: s.radiusM })),
  };
}

/** Haversine distance in meters, or null without a point. */
function distanceMeters(lat1, lng1, site) {
  if (lat1 == null || !site?.lat || !site?.lng) return null;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(site.lat - lat1);
  const dLng = toRad(site.lng - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(site.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

router.get(
  '/policy',
  asyncHandler(async (req, res) => {
    const policy = await policyFor(req.principal.orgId);
    return res.json({
      requiresLocation: policy.requiresLocation,
      allowOverride: policy.allowOverride,
      workdayMinutes: policy.workdayMinutes,
      sites: policy.sites,
    });
  }),
);

/** The signed-in user's open session today, in the mock's `today` shape. */
router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const date = nepalToday();
    const policy = await policyFor(orgId);
    const [session, lastPunch, user] = await Promise.all([
      prisma.attendanceSession.findUnique({
        where: { orgId_userId_date: { orgId, userId, date } },
      }),
      prisma.punch.findFirst({ where: { orgId, userId, date }, orderBy: { at: 'desc' } }),
      prisma.user.findUnique({ where: { id: userId }, select: { site: true } }),
    ]);
    const open = session && !session.clockOut ? session : null;
    const siteRow = policy.sites.find((s) => s.name === user?.site) ?? policy.sites[0] ?? null;
    return res.json({
      session: open
        ? {
            id: open.id,
            startedAt: open.clockIn?.toISOString() ?? null,
            site: siteRow?.name ?? null,
            lastPunch: lastPunch
              ? { id: lastPunch.id, kind: lastPunch.kind, at: lastPunch.at.toISOString() }
              : null,
          }
        : null,
      site: siteRow ? { id: siteRow.id, name: siteRow.name } : null,
      schedule: {
        expectedMinutes: policy.workdayMinutes,
        shift: `${policy.shift.name} ${policy.shift.start}–${policy.shift.end}`,
        start: policy.shift.start,
        end: policy.shift.end,
      },
    });
  }),
);

const punchSchema = z.object({
  kind: z.enum(['in', 'out']),
  idempotencyKey: z.string().min(8),
  clientTs: z.string().datetime().optional().nullable(),
  location: z
    .object({ lat: z.number(), lng: z.number(), siteId: z.string().optional().nullable() })
    .optional()
    .nullable(),
});

/** POST /attendance/punch — contract row 2. Idempotent via the punch key. */
router.post(
  '/punch',
  idempotency(),
  validate(punchSchema),
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const { kind, idempotencyKey, clientTs, location } = req.body;
    const date = nepalToday();

    // Replay check on the punch key itself (offline retry dedupe).
    const seen = await prisma.punch.findUnique({ where: { idempotencyKey } });
    if (seen) {
      return res.json({
        record: {
          id: seen.id,
          kind: seen.kind,
          at: seen.at.toISOString(),
          clientTs: seen.clientTs?.toISOString() ?? null,
          site: seen.site,
          distanceM: seen.distanceM,
          needsReview: seen.needsReview,
          reason: seen.reason,
        },
        deduped: true,
      });
    }

    const open = await prisma.attendanceSession.findUnique({
      where: { orgId_userId_date: { orgId, userId, date } },
    });
    if (kind === 'in' && open && !open.clockOut) {
      throw conflict('You are already clocked in.');
    }
    if (kind === 'out' && (!open || !open.clockIn || open.clockOut)) {
      throw conflict('There is no open session to close.');
    }

    const policy = await policyFor(orgId);
    const site = location?.siteId
      ? policy.sites.find((s) => s.id === location.siteId)
      : location
        ? [...policy.sites]
            .map((s) => ({ ...s, d: distanceMeters(location.lat, location.lng, s) }))
            .filter((s) => s.d != null && s.d <= s.radiusM)
            .sort((a, b) => a.d - b.d)[0]
        : null;
    const distance = location && site ? distanceMeters(location.lat, location.lng, site) : null;
    const flagged = Boolean(policy.requiresLocation && !location);
    const at = new Date();

    const punch = await prisma.punch.create({
      data: {
        orgId,
        userId,
        date,
        kind,
        at,
        clientTs: clientTs ? new Date(clientTs) : null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        site: site?.name ?? null,
        distanceM: distance,
        needsReview: flagged,
        reason: flagged ? 'no_location' : null,
        idempotencyKey,
      },
    });

    if (kind === 'in') {
      await prisma.attendanceSession.upsert({
        where: { orgId_userId_date: { orgId, userId, date } },
        update: {
          clockIn: at,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          siteId: site?.id ?? null,
        },
        create: {
          orgId,
          userId,
          date,
          clockIn: at,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          siteId: site?.id ?? null,
          status: 'present',
          exception: flagged ? 'no_location' : null,
        },
      });
    } else if (open) {
      const workedMinutes = minutesBetween(open.clockIn, at);
      const late = open.clockIn && policy.shift ? nepalTime(open.clockIn) > policy.shift.start : false;
      await prisma.attendanceSession.update({
        where: { id: open.id },
        data: { clockOut: at, workedMinutes, status: late ? 'late' : 'present' },
      });
    }

    return res.json({
      record: {
        id: punch.id,
        kind: punch.kind,
        at: punch.at.toISOString(),
        clientTs: punch.clientTs?.toISOString() ?? null,
        site: punch.site,
        distanceM: punch.distanceM,
        needsReview: punch.needsReview,
        reason: punch.reason,
      },
      needsReview: punch.needsReview,
      reason: punch.reason,
    });
  }),
);

/** GET /attendance/history — page-based rows, newest first (contract row 24). */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const { page, perPage, skip, take } = parsePaging(req.query, { size: 10, max: 100 });
    const [rows, total] = await Promise.all([
      prisma.attendanceSession.findMany({
        where: { orgId, userId },
        orderBy: { date: 'desc' },
        skip,
        take,
      }),
      prisma.attendanceSession.count({ where: { orgId, userId } }),
    ]);
    return res.json({
      rows: rows.map((row) => ({
        id: row.id,
        date: row.date,
        clockIn: nepalTime(row.clockIn),
        clockOut: nepalTime(row.clockOut),
        workedMinutes: row.workedMinutes ?? 0,
        status: row.status,
        exception: row.exception ?? null,
        correction: null,
      })),
      page,
      perPage,
      hasMore: page * perPage < total,
    });
  }),
);

/** GET /attendance/calendar?month=YYYY-MM — contract row 27. */
router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const month = req.query.month;
    if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw badMonth();
    }
    const { orgId, userId } = req.principal;
    const [year, monthNum] = month.split('-').map(Number);
    const total = daysInMonth(year, monthNum);
    const pad = (n) => String(n).padStart(2, '0');
    const first = `${month}-01`;
    const last = `${month}-${pad(total)}`;
    const today = nepalToday();

    const [sessions, holidays, leaves] = await Promise.all([
      prisma.attendanceSession.findMany({
        where: { orgId, userId, date: { gte: first, lte: last } },
      }),
      prisma.holiday.findMany({ where: { orgId, date: { gte: first, lte: last } } }),
      prisma.leaveRequest.findMany({
        where: { orgId, requesterId: userId, status: 'approved', from: { lte: last }, to: { gte: first } },
      }),
    ]);
    const byDate = new Map(sessions.map((s) => [s.date, s]));
    const holidayDates = new Set(holidays.map((h) => h.date));
    const leaveDates = new Set();
    for (const leave of leaves) {
      for (const row of sessions) void row;
      let cursor = leave.from;
      while (cursor <= leave.to) {
        leaveDates.add(cursor);
        const d = new Date(`${cursor}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        cursor = d.toISOString().slice(0, 10);
      }
    }

    const days = [];
    for (let day = 1; day <= total; day += 1) {
      const date = `${month}-${pad(day)}`;
      if (date > today) {
        days.push({ date, status: null });
        continue;
      }
      const session = byDate.get(date);
      if (session) {
        days.push({
          date,
          status: session.status,
          workedMinutes: session.workedMinutes ?? 0,
          clockIn: nepalTime(session.clockIn),
          clockOut: nepalTime(session.clockOut),
        });
        continue;
      }
      const status = holidayDates.has(date) || weekdayOf(date) === 6 ? 'holiday' : leaveDates.has(date) ? 'leave' : 'absent';
      days.push({ date, status, workedMinutes: 0, clockIn: null, clockOut: null });
    }
    return res.json({ month, days });
  }),
);

function badMonth() {
  return new AppError('invalid_month', 'Month must be YYYY-MM.', { httpStatus: 422 });
}

/** GET /attendance/team?date=YYYY-MM-DD — scope-aware board (contract rows 24/30). */
router.get(
  '/team',
  asyncHandler(async (req, res) => {
    const { orgId, userId, role } = req.principal;
    const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : nepalToday();
    if (typeof req.query.date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      throw new AppError('invalid_date', 'Dates must be YYYY-MM-DD.', { httpStatus: 422 });
    }
    const scope = scopeFor(req.principal);
    if (scope === 'self') {
      throw new AppError('out_of_scope', 'The team board is outside your data scope.', { httpStatus: 403 });
    }
    // Team scope narrows to the reviewer's teams; department to the department;
    // organization sees everyone.
    const where = { orgId, active: true };
    if (scope === 'team' && req.principal.teamIds?.length) {
      where.id = {
        in: (
          await prisma.user.findMany({
            where: {
              orgId,
              OR: [
                { memberTeams: { some: { id: { in: req.principal.teamIds } } } },
                { leadingTeams: { some: { id: { in: req.principal.teamIds } } } },
              ],
            },
            select: { id: true },
          })
        ).map((u) => u.id),
      };
    } else if (scope === 'department' && req.principal.departmentId) {
      where.departmentId = req.principal.departmentId;
    }
    void role;

    const [people, sessions, leaves] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, initials: true, site: true },
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

    const rows = people.map((person) => {
      const session = sessionByUser.get(person.id);
      let presence = 'out';
      let exception = null;
      if (onLeave.has(person.id)) {
        presence = 'leave';
      } else if (session?.clockIn && !session.clockOut) {
        presence = session.status === 'late' ? 'late' : 'in';
      } else if (session?.clockIn && session.clockOut) {
        presence = 'out';
      }
      if (session?.status === 'late' && presence === 'late') exception = 'late_arrival';
      if (!session && presence === 'out' && !onLeave.has(person.id)) exception = 'no_punch';
      return {
        id: person.id,
        name: person.name,
        initials: person.initials,
        site: person.site,
        presence,
        clockIn: nepalTime(session?.clockIn),
        workedMinutes: session?.workedMinutes ?? 0,
        exception,
      };
    });

    const count = (p) => rows.filter((r) => r.presence === p).length;
    return res.json({
      summary: {
        present: count('in'),
        late: count('late'),
        onLeave: count('leave'),
        notIn: count('out'),
        expected: rows.length,
      },
      rows,
    });
  }),
);

/** Serialize a correction into the queue row the UI renders. */
function correctionRow(row) {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    requester: row.requester?.name ?? '—',
    date: row.date,
    original: payload.original ?? null,
    proposed: payload.proposed ?? null,
    reason: row.reason,
    status: row.status,
    note: payload.note ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** GET /attendance/corrections?status=all|pending|mine (contract rows 24/30). */
router.get(
  '/corrections',
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const scope = scopeFor(req.principal);
    const where = { orgId };
    if (status === 'mine' || scope === 'self') {
      where.requesterId = userId;
    } else if (status === 'pending') {
      where.status = 'in_review';
    }
    const rows = await prisma.attendanceCorrection.findMany({
      where,
      include: { requester: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ rows: rows.map(correctionRow), page: 1, hasMore: false });
  }),
);

const correctionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  original: z
    .object({
      id: z.string().nullable().optional(),
      clockIn: z.string().nullable(),
      clockOut: z.string().nullable(),
      date: z.string().optional(),
    })
    .optional()
    .nullable(),
  proposed: z.object({
    clockIn: z.string().min(1),
    clockOut: z.string().min(1),
  }),
  reason: z.string(),
});

/** POST /attendance/corrections — contract row 24. */
router.post(
  '/corrections',
  validate(correctionSchema),
  asyncHandler(async (req, res) => {
    const { orgId, userId } = req.principal;
    const { original, proposed, reason, date } = req.body;
    if (!proposed?.clockIn || !proposed?.clockOut) {
      throw new AppError('invalid_correction', 'A correction needs both a clock-in and a clock-out.', {
        httpStatus: 422,
      });
    }
    if ((reason ?? '').trim().length < 5) {
      throw new AppError('reason_required', 'Explain what needs correcting.', { httpStatus: 422 });
    }
    const row = await prisma.attendanceCorrection.create({
      data: {
        orgId,
        requesterId: userId,
        date: date ?? original?.date ?? nepalToday(),
        payload: { original: original ?? null, proposed },
        reason: reason.trim(),
        status: 'in_review',
      },
    });
    await audit(req, 'attendance', 'correctionRequested', { correctionId: row.id });
    return res.json({ id: row.id, status: row.status });
  }),
);

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_info']),
  note: z.string().optional(),
});

/** POST /attendance/corrections/:id/decision — contract row 24. */
router.post(
  '/corrections/:id/decision',
  validate(decisionSchema),
  asyncHandler(async (req, res) => {
    const { orgId } = req.principal;
    const { decision, note } = req.body;
    if (decision !== 'approve' && !(note ?? '').trim()) {
      throw new AppError('note_required', 'Add a short note so the request can be answered.', {
        httpStatus: 422,
      });
    }
    const existing = await prisma.attendanceCorrection.findFirst({
      where: { id: req.params.id, orgId },
      include: { requester: { select: { name: true } } },
    });
    if (!existing) {
      throw new AppError('not_found', 'That request no longer exists.', { httpStatus: 404 });
    }
    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs_info';
    const payload = { ...(existing.payload ?? {}), note: note?.trim() || null };
    const updated = await prisma.attendanceCorrection.update({
      where: { id: existing.id },
      data: { status, payload, deciderId: req.principal.userId, decidedAt: new Date() },
    });
    // An approval applies the proposed times to the day's session (§7.5).
    if (decision === 'approve' && payload.proposed) {
      const session = await prisma.attendanceSession.findUnique({
        where: { orgId_userId_date: { orgId, userId: existing.requesterId, date: existing.date } },
      });
      if (session) {
        const inParts = payload.proposed.clockIn.split(':');
        const outParts = payload.proposed.clockOut.split(':');
        const clockIn = new Date(`${existing.date}T${inParts[0].padStart(2, '0')}:${inParts[1] ?? '00'}:00+05:45`);
        const clockOut = new Date(`${existing.date}T${outParts[0].padStart(2, '0')}:${outParts[1] ?? '00'}:00+05:45`);
        await prisma.attendanceSession.update({
          where: { id: session.id },
          data: {
            clockIn,
            clockOut,
            workedMinutes: minutesBetween(clockIn, clockOut),
            exception: null,
          },
        });
      }
    }
    await audit(req, 'attendance', `correction${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'InfoRequested'}`, {
      correctionId: updated.id,
    });
    return res.json({ record: correctionRow({ ...updated, requester: existing.requester }) });
  }),
);


export default router;
export { policyFor };
