import { assign, fromPromise, setup } from 'xstate';

/**
 * Offline queue machine (Section 7.2): every queued action carries an
 * idempotency key so a flush can never double-post, and nothing is dropped
 * silently — items the server rejects stay visible as `needs_attention`.
 *
 *   online ⇄ offline · flushing → online | partialFailure | flushFailed
 *
 * Platform-neutral: it persists through whatever storage the host provides.
 * iOS cannot background-sync, so the web app flushes on `online` and on
 * foreground; the machine itself only cares about events.
 *
 * @param {object} input
 * @param {(items: Array<object>) => Promise<{sent: string[], failed: Array<{id: string, reason: string}>}>} input.flush
 */

/** Backoff before a failed item is retried (ms). Exponential, capped at 10 min. */
export function retryDelayMs(attempts) {
  return Math.min(600_000, 1_000 * 2 ** Math.max(0, attempts - 1));
}

/** Queue an item without allowing duplicate idempotency keys. */
export function enqueue(items, item) {
  if (items.some((existing) => existing.idempotencyKey === item.idempotencyKey)) return items;
  return [...items, { attempts: 0, status: 'queued', ...item }];
}

/** Ordered per entity so a clock-out can never reach the server before its clock-in. */
export function orderedQueued(items) {
  return items
    .filter((item) => item.status === 'queued' || item.status === 'sending')
    .sort((a, b) => new Date(a.clientTs) - new Date(b.clientTs));
}

export function createOfflineQueueMachine({ flush, initialItems = [] } = {}) {
  return setup({
    types: { context: {}, events: {}, input: {} },
    actors: {
      flush: fromPromise(({ input }) => flush(input.items)),
    },
    actions: {
      enqueueItem: assign(({ context, event }) => ({
        items: enqueue(context.items, event.item),
      })),
      markSending: assign(({ context, event }) => {
        const ids = event.ids ?? null;
        return {
          items: context.items.map((item) =>
            (ids ? ids.includes(item.id) : item.status === 'queued')
              ? { ...item, status: 'sending', attempts: item.attempts + 1 }
              : item,
          ),
        };
      }),
      /** Retry a failed item: needs_attention → queued so the flush picks it up. */
      requeueFailed: assign(({ context }) => ({
        items: context.items.map((item) =>
          item.status === 'needs_attention' ? { ...item, status: 'queued', reason: null } : item,
        ),
      })),
      storeResult: assign(({ context, event }) => {
        const sent = new Set(event.output?.sent ?? []);
        const failed = new Map((event.output?.failed ?? []).map((f) => [f.id, f]));
        return {
          items: context.items.map((item) => {
            if (sent.has(item.id)) return { ...item, status: 'sent', reason: null };
            const failure = failed.get(item.id);
            if (failure) return { ...item, status: 'needs_attention', reason: failure.reason };
            return item;
          }),
          lastFlush: { sent: sent.size, failed: failed.size },
        };
      }),
      storeError: assign(({ context, event }) => ({
        items: context.items.map((item) =>
          item.status === 'sending' ? { ...item, status: 'queued' } : item,
        ),
        lastError: event.error?.message ?? 'flush failed',
      })),
      setOnline: assign({ online: true }),
      setOffline: assign({ online: false }),
    },
    guards: {
      hasQueued: ({ context }) => orderedQueued(context.items).length > 0,
      hasFailures: ({ event }) => (event.output?.failed ?? []).length > 0,
    },
  }).createMachine({
    id: 'offlineQueue',
    context: () => ({ items: initialItems, online: true, lastFlush: null, lastError: null }),
    initial: 'online',
    states: {
      online: {
        on: {
          GO_OFFLINE: { target: 'offline', actions: 'setOffline' },
          ENQUEUE: { actions: 'enqueueItem' },
          // Always settle, even with nothing queued: a caller awaiting the
          // flush must never hang because the queue happened to be empty.
          FLUSH: { target: 'flushing', actions: 'markSending' },
        },
      },

      offline: {
        entry: 'setOffline',
        on: {
          GO_ONLINE: [
            { target: 'flushing', guard: 'hasQueued', actions: ['setOnline', 'markSending'] },
            { target: 'online', actions: 'setOnline' },
          ],
          ENQUEUE: { actions: 'enqueueItem' },
          FLUSH: { target: 'flushing', guard: 'hasQueued', actions: 'markSending' },
        },
      },

      flushing: {
        invoke: {
          src: 'flush',
          input: ({ context }) => ({ items: orderedQueued(context.items) }),
          onDone: [
            {
              guard: 'hasFailures',
              target: 'partialFailure',
              actions: ['setOnline', 'storeResult'],
            },
            { target: 'online', actions: ['setOnline', 'storeResult'] },
          ],
          // Network trouble: keep every item and stop claiming connectivity.
          onError: [{ target: 'flushFailed', actions: ['setOffline', 'storeError'] }],
        },
      },

      /** The flush could not reach the server — items stay queued, not lost. */
      flushFailed: {
        on: {
          GO_ONLINE: [
            { target: 'flushing', guard: 'hasQueued', actions: ['setOnline', 'markSending'] },
            { target: 'online', actions: 'setOnline' },
          ],
          GO_OFFLINE: { target: 'offline' },
          ENQUEUE: { actions: 'enqueueItem' },
          RETRY_FAILED: [
            { target: 'flushing', guard: 'hasQueued', actions: 'markSending' },
            { target: 'online', actions: 'setOnline' },
          ],
          FLUSH: { target: 'flushing', guard: 'hasQueued', actions: 'markSending' },
        },
      },

      partialFailure: {
        // Items stay visible with a reason; the user can retry or resolve them
        // one tap at a time — the queue never drops an unsent action.
        on: {
          GO_OFFLINE: { target: 'offline' },
          RETRY_FAILED: {
            target: 'flushing',
            actions: ['requeueFailed', 'markSending'],
          },
          FLUSH: { target: 'flushing', actions: ['requeueFailed', 'markSending'] },
          DISCARD: {
            target: 'online',
            actions: assign(({ context, event }) => ({
              items: context.items.filter(
                (item) => item.status !== 'needs_attention' || item.id !== event.id,
              ),
            })),
          },
        },
      },
    },
  });
}
