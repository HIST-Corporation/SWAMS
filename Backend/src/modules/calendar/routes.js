// @ts-check
/**
 * Calendar module — one payload owns the grid, the agenda and the holiday
 * section (contract row 23). Only days with events appear; dates ascend;
 * range validation mirrors the mock exactly (invalid_date / invalid_range /
 * range_too_long).
 */
import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../common/errors.js';
import { nepalToday } from '../../common/time.js';

const router = Router();
const MAX_RANGE_DAYS = 92;
const isIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));

/** Default bounds: the current Nepal month (the client's default view). */
function defaultMonth() {
  const today = nepalToday();
  const [year, month] = today.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const fallback = defaultMonth();
    const from = req.query.from || fallback.from;
    const to = req.query.to || fallback.to;
    if (!isIso(from) || !isIso(to)) {
      throw new AppError('invalid_date', 'Dates must be YYYY-MM-DD.', { httpStatus: 422 });
    }
    if (from > to) {
      throw new AppError(
        'invalid_range',
        'The start date must be on or before the end date.',
        { httpStatus: 422 },
      );
    }
    const span =
      Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1;
    if (span > MAX_RANGE_DAYS) {
      throw new AppError('range_too_long', 'Ask for at most 92 days at a time.', { httpStatus: 422 });
    }

    const { orgId } = req.principal;
    const [events, holidays, leaves] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: { orgId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      }),
      prisma.holiday.findMany({ where: { orgId, date: { gte: from, lte: to } } }),
      prisma.leaveRequest.findMany({
        where: { orgId, status: 'approved', from: { lte: to }, to: { gte: from } },
        include: { requester: { select: { name: true } } },
      }),
    ]);

    /** @type {Map<string, Array<{kind: string, title: string}>>} */
    const byDate = new Map();
    const push = (date, event) => {
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(event);
    };
    for (const row of events) {
      push(row.date, { kind: row.kind, title: row.title });
    }
    for (const holiday of holidays) {
      push(holiday.date, { kind: 'holiday', title: holiday.title });
    }
    for (const leave of leaves) {
      let cursor = leave.from;
      while (cursor <= leave.to && cursor <= to) {
        if (cursor >= from) {
          push(cursor, {
            kind: 'leave',
            title: `${leave.requester?.name ?? 'Colleague'} — ${leave.typeKey} leave`,
          });
        }
        const d = new Date(`${cursor}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        cursor = d.toISOString().slice(0, 10);
      }
    }

    return res.json({
      from,
      to,
      days: [...byDate.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, dayEvents]) => ({ date, events: dayEvents })),
      holidays: holidays.map((h) => ({
        date: h.date,
        title: h.title,
        scope: h.scope,
        region: h.region ?? null,
        regionLabel: h.regionLabel ?? null,
      })),
    });
  }),
);

export default router;
