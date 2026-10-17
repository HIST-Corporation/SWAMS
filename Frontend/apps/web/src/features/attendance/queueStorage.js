/**
 * Persistent home for the offline punch queue (slice 3 → PWA slice, §7.2).
 *
 * The queue machine itself is platform-neutral; this adapter is the web host's
 * answer: `localStorage`, so an unsent punch survives a hard reload while
 * offline. Only unsent items are stored (`sent` is terminal and useless on
 * restore). Anything ambiguous is dropped, never resurrected wrong:
 *  - `sending` at reload time becomes `queued` — the flight may or may not
 *    have reached the server, and the idempotency key makes the retry safe;
 *  - corrupt JSON, a non-array, or items missing their keys load as `[]`;
 *  - storage failures (private mode, quota) are swallowed: the in-memory
 *    queue still works for the session, persistence is best-effort.
 */

const STORAGE_KEY = 'swams.queue.attendance.v1';

/** Bound the stored queue so one bad session can never fill the quota. */
const MAX_ITEMS = 50;

/**
 * Items the queue may legitimately hold across a reload. Anything else is
 * dropped rather than reinterpreted.
 */
function sanitize(items) {
  return items
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.idempotencyKey === 'string' &&
        typeof item.clientTs === 'string',
    )
    .map((item) => (item.status === 'sending' ? { ...item, status: 'queued' } : item))
    .filter((item) => item.status !== 'sent')
    .slice(-MAX_ITEMS);
}

/** @returns {Array<object>} the unsent queue, or `[]` when there is none. */
export function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitize(parsed);
  } catch {
    return [];
  }
}

/** Persist the unsent tail of the queue; failures keep the session working. */
export function saveQueue(items) {
  try {
    const unsent = (items ?? []).filter(
      (item) => item && typeof item.id === 'string' && item.status !== 'sent',
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unsent.slice(-MAX_ITEMS)));
  } catch {
    /* private mode / quota: the in-memory queue still covers this session */
  }
}

/** Forget the stored queue (used by tests and, later, sign-out). */
export function clearQueue() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing stored is nothing lost */
  }
}
