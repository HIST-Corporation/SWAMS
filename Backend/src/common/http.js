// @ts-check
/** Shared HTTP helpers — one response envelope across all modules. */
import { randomUUID } from 'node:crypto';

/** Page-based pagination parser (contract items 7/9/20 use page&perPage). */
export function parsePaging(query, defaults = {}) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const perPage = Math.min(
    defaults.max ?? 100,
    Math.max(1, Number.parseInt(query.perPage ?? String(defaults.size ?? 20), 10) || defaults.size || 20),
  );
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function pagedResult(rows, total, page, perPage) {
  return { rows, page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)), hasMore: page * perPage < total };
}

/** Cursor pagination (contract item 9) — opaque base64 cursor over id. */
export function cursorResult(items, nextCursor) {
  return { items, nextCursor: nextCursor ?? null };
}

/** @param {unknown} id */
export function encodeCursor(id) {
  return Buffer.from(String(id), 'utf8').toString('base64url');
}

/** @param {unknown} cursor */
export function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    return Buffer.from(String(cursor), 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function newRequestId() {
  return randomUUID();
}

/** Nepal timezone helpers (Asia/Kathmandu, UTC+5:45 — no DST). */
export const NEPAL_TZ_OFFSET_MINUTES = 345;

/** Current date in Nepal as YYYY-MM-DD. @param {Date} [now] */
export function nepalDateString(now = new Date()) {
  const shifted = new Date(now.getTime() + NEPAL_TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** YYYY-MM validator (contract item 27). @param {unknown} v */
export function isYearMonth(v) {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

/** YYYY-MM-DD validator (contract items 23/24). @param {unknown} v */
export function isDateString(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
