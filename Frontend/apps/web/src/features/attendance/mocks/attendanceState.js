/**
 * Mutable attendance state for the MSW mock (slice 3). MOCK ONLY — this is an
 * in-memory stand-in for `POST /attendance/punch`; it is never persisted and
 * never presented as production behavior.
 *
 * Documented mock rules (deterministic, so tests and screenshots are stable):
 *  - the first accepted punch of the day is a clock-in, the next is a clock-out
 *  - clocking in while a session is open → 409 `already_clocked_in`
 *  - a punch with no location while the policy requires one is still saved,
 *    but flagged `needsReview` with reason `no_location` (§7.1 FAIL path)
 *  - punching twice with the same `idempotencyKey` returns the first record
 *    (that is the whole point of the key: an offline retry cannot double-post)
 */
import { seedCorrections } from './fixtures.js';

const STORAGE_KEY = 'swams.mock.attendance';

function load() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (raw && typeof raw === 'object') return raw;
  } catch {
    /* private mode: in-memory only */
  }
  // A fresh mock session starts with one request already waiting for a reviewer
  // so the manager bench is not empty (fixture data, labeled as such).
  return { openSession: null, punches: [], seenKeys: {}, corrections: seedCorrections() };
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode: in-memory only */
  }
}

export const state = load();

export function resetAttendanceState() {
  state.openSession = null;
  state.punches = [];
  state.seenKeys = {};
  // Back to the seeded baseline, not an empty list: the fixture request must
  // still be there for the next session (and for tests).
  state.corrections = seedCorrections();
  persist();
}

/** @returns {object} the stored punch record */
export function applyPunch({ kind, idempotencyKey, clientTs, location, needsReview, reason }) {
  const record = {
    id: `punch_${state.punches.length + 1}`,
    kind,
    at: new Date().toISOString(),
    clientTs,
    site: location ? 'Baneshwor' : null,
    distanceM: null,
    needsReview: Boolean(needsReview),
    reason: reason ?? null,
  };
  state.punches.push(record);
  state.seenKeys[idempotencyKey] = record.id;
  if (kind === 'in') {
    state.openSession = {
      id: record.id,
      startedAt: record.at,
      site: record.site,
      lastPunch: record,
    };
  } else {
    state.openSession = null;
  }
  persist();
  return record;
}

/**
 * Record a correction request (mock). The server owns the lifecycle; this only
 * mirrors the transitions so the UI can be built and tested (§7.5). The
 * default requester is the staff demo persona; the handlers pass the real
 * signed-in name instead.
 * @returns {object} the stored correction record
 */
export function addCorrection({ original, proposed, reason, requester = 'Priya Sharma' }) {
  state.corrections = state.corrections ?? [];
  const record = {
    id: `corr_${state.corrections.length + 1}`,
    requester,
    date: original?.date ?? new Date().toISOString().slice(0, 10),
    original: original ?? null,
    proposed: proposed ?? null,
    reason: reason ?? '',
    status: 'in_review',
    note: null,
    createdAt: new Date().toISOString(),
  };
  state.corrections.push(record);
  persist();
  return record;
}

/**
 * Apply a reviewer decision (mock). `request_info` reopens the request with the
 * reviewer's question pinned.
 * @returns {object|null} the updated record, or null when it does not exist
 */
export function decideCorrectionRecord(id, decision, note) {
  const record = (state.corrections ?? []).find((item) => item.id === id);
  if (!record) return null;
  record.status =
    decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs_info';
  record.note = note ?? null;
  persist();
  return record;
}
