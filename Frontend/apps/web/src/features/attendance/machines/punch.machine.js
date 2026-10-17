import { assign, fromPromise, setup } from 'xstate';

/**
 * Punch machine (Section 7.1): the hero interaction of the app.
 *
 *   idle → checking → submitting → settled → working | idle
 *   checking ── PERMISSION_DENIED → permissionHelp → checking
 *   submitting ── offline → queued → syncing → settled | needsReview
 *   working ⇄ onBreak · working → confirmOut → checking(out)
 *
 * All I/O is injected so tests walk every transition without network. The
 * server's record is the truth once received (§7.1 guards): the machine stores
 * `lastPunch` from the response and never invents attendance.
 *
 * Geofence/selfie policy is *shown*, never enforced here — `checkPolicy`
 * returns the checks the API performed; a failed check still saves the punch
 * and lands in `needsReview` (§8.4, anti-surveillance rule).
 *
 * @param {object} input
 * @param {(input: {kind: 'in'|'out', site?: object}) => Promise<{decision:'pass'|'fail'|'denied', checks?: object[], reason?: string, allowOverride?: boolean}>} input.checkPolicy
 * @param {(input: {kind:'in'|'out', idempotencyKey:string, clientTs:string}) => Promise<{record: object, needsReview?: boolean, reason?: string}>} input.submitPunch
 * @param {() => string} [input.newKey] idempotency-key source (injected for tests)
 *
 * Flushing is event-driven (`FLUSH_DONE` / `FLUSH_FAILED`) rather than an
 * invoked actor: the host hook performs the network work against the offline
 * queue and reports the outcome, keeping this machine free of a second actor.
 * @param {() => Date} [input.now]
 */

/** @typedef {'idle'|'checking'|'permissionHelp'|'submitting'|'queued'|'syncing'|'working'|'onBreak'|'confirmOut'|'needsReview'|'error'} PunchStatus */

export const PUNCH_STATES = /** @type {const} */ ([
  'idle',
  'checking',
  'permissionHelp',
  'submitting',
  'queued',
  'syncing',
  'working',
  'onBreak',
  'confirmOut',
  'needsReview',
  'error',
]);

export function createPunchMachine({
  checkPolicy,
  submitPunch,
  newKey = () => `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  now = () => new Date(),
} = {}) {
  return setup({
    types: { context: {}, events: {}, input: {} },
    actors: {
      checkPolicy: fromPromise(({ input }) => checkPolicy(input)),
      submitPunch: fromPromise(({ input }) => submitPunch(input)),
    },
    actions: {
      /** Open a punch attempt: remember kind + a stable idempotency key. */
      beginAttempt: assign(({ event, context }) => ({
        kind: event.kind ?? context.kind ?? 'in',
        idempotencyKey: context.idempotencyKey ?? newKey(),
        clientTs: now().toISOString(),
        error: null,
        needsReviewReason: null,
      })),
      /** Clock-out is expressed by the machine, not the event payload. */
      markOut: assign({ kind: 'out' }),
      storePolicy: assign(({ event }) => ({
        checks: event.output?.checks ?? [],
        allowOverride: event.output?.allowOverride === true,
        flagged: event.output?.decision === 'fail',
        needsReviewReason: event.output?.reason ?? null,
      })),
      storePermissionError: assign(({ event }) => ({
        error: Object.assign(new Error(event.error?.message ?? 'Permission denied'), {
          code: event.error?.code ?? 'permission_denied',
        }),
      })),
      storeError: assign(({ event }) => ({ error: event.error })),
      /** Clear the error but keep the attempt key so a retry cannot double-punch. */
      clearError: assign({ error: null }),

      /** Only after the server confirms do we start the clock (§7.1 guards). */
      storePunchResult: assign(({ event, context }) => {
        const record = event.output?.record ?? null;
        const flagged = context.flagged || event.output?.needsReview === true;
        return {
          lastPunch: record,
          needsReviewReason: flagged ? (event.output?.reason ?? context.needsReviewReason) : null,
          startedAt: context.kind === 'in' ? (record?.at ?? context.clientTs) : context.startedAt,
          // The punch is saved: a later attempt must get a fresh key.
          idempotencyKey: null,
        };
      }),
      /** Clock-out ends the day: the clock stops; segments stay server-owned. */
      closeDay: assign({ startedAt: null, breakStartedAt: null, kind: null, idempotencyKey: null }),
      queueAttempt: assign(({ context }) => ({
        pending: {
          kind: context.kind,
          idempotencyKey: context.idempotencyKey,
          clientTs: context.clientTs,
        },
        queuedCount: context.queuedCount + 1,
      })),
      clearPending: assign({ pending: null, queuedCount: 0, idempotencyKey: null }),
      startBreak: assign(() => ({ breakStartedAt: now().toISOString() })),
      endBreak: assign(({ context }) => ({
        segments: [
          ...context.segments,
          { start: context.breakStartedAt, end: now().toISOString() },
        ],
        breakStartedAt: null,
      })),
      reset: assign({ error: null, needsReviewReason: null, idempotencyKey: null, kind: null }),
    },
    guards: {
      policyDenied: ({ event }) => event.output?.decision === 'denied',
      overrideAllowed: ({ context }) => context.allowOverride === true,
      flagged: ({ event, context }) =>
        context.flagged === true || event.output?.needsReview === true,
      wentOffline: ({ event }) =>
        event.error?.offline === true ||
        event.error?.code === 'network_error' ||
        event.error?.code === 'offline',
      hasConflicts: ({ event }) => (event.conflicts ?? 0) > 0,
      kindIsIn: ({ context }) => context.kind === 'in',
      canRetry: ({ context }) => context.idempotencyKey != null,
    },
  }).createMachine({
    id: 'punch',
    context: ({ input }) => ({
      kind: null,
      idempotencyKey: null,
      clientTs: null,
      /** Policy checks from the last attempt (labels come from i18n by id). */
      checks: [],
      allowOverride: false,
      flagged: false,
      /** Server-confirmed punch record; the only trusted time. */
      lastPunch: null,
      startedAt: null,
      breakStartedAt: null,
      segments: [],
      pending: null,
      queuedCount: 0,
      error: null,
      needsReviewReason: null,
      site: input?.site ?? null,
    }),
    initial: 'idle',
    states: {
      idle: {
        on: {
          PUNCH_IN: { target: 'checking', actions: 'beginAttempt' },
          /** A server-reported open session resumes straight into working. */
          HYDRATE_OPEN: {
            target: 'working',
            actions: assign(({ event }) => ({
              startedAt: event.session?.startedAt ?? null,
              lastPunch: event.session?.lastPunch ?? null,
              segments: event.session?.segments ?? [],
            })),
          },
        },
      },

      checking: {
        invoke: {
          src: 'checkPolicy',
          input: ({ context }) => ({ kind: context.kind, site: context.site }),
          onDone: [
            { guard: 'policyDenied', target: 'permissionHelp', actions: 'storePolicy' },
            { target: 'submitting', actions: 'storePolicy' },
          ],
          onError: [{ target: 'permissionHelp', actions: 'storePermissionError' }],
        },
        on: { CANCEL: { target: 'idle', actions: 'reset' } },
      },

      permissionHelp: {
        on: {
          RETRY: { target: 'checking', actions: 'clearError' },
          /** Policy allows location override: submit anyway, clearly flagged. */
          PUNCH_ANYWAY: {
            target: 'submitting',
            guard: 'overrideAllowed',
            actions: assign({ flagged: true }),
          },
          CANCEL: { target: 'idle', actions: 'reset' },
        },
      },

      submitting: {
        invoke: {
          src: 'submitPunch',
          input: ({ context }) => ({
            kind: context.kind,
            idempotencyKey: context.idempotencyKey,
            clientTs: context.clientTs,
          }),
          onDone: [
            { guard: 'flagged', target: 'needsReview', actions: 'storePunchResult' },
            { target: 'settled', actions: 'storePunchResult' },
          ],
          onError: [
            { guard: 'wentOffline', target: 'queued', actions: ['storeError', 'queueAttempt'] },
            { target: 'error', actions: 'storeError' },
          ],
        },
      },

      /** Completion by kind: clock-in → working, clock-out → idle. */
      settled: {
        always: [
          { guard: 'kindIsIn', target: 'working', actions: 'clearPending' },
          { target: 'idle', actions: ['closeDay', 'clearPending'] },
        ],
      },

      queued: {
        on: {
          ONLINE: { target: 'syncing' },
          SYNC_NOW: { target: 'syncing' },
        },
      },

      syncing: {
        // The host flushes the offline queue and reports the outcome here.
        on: {
          FLUSH_DONE: [
            { guard: 'hasConflicts', target: 'needsReview', actions: 'clearPending' },
            { target: 'settled', actions: 'clearPending' },
          ],
          FLUSH_FAILED: { target: 'queued', actions: 'storeError' },
        },
      },

      working: {
        on: {
          BREAK: { target: 'onBreak', actions: 'startBreak' },
          PUNCH_OUT: { target: 'confirmOut' },
          SESSION_ENDED: 'idle',
        },
      },

      onBreak: {
        on: {
          RESUME: { target: 'working', actions: 'endBreak' },
          PUNCH_OUT: { target: 'confirmOut' },
        },
      },

      confirmOut: {
        on: {
          PUNCH_OUT: { target: 'checking', actions: ['markOut', 'beginAttempt'] },
          CANCEL: 'working',
        },
      },

      needsReview: {
        on: {
          ACK: [
            { guard: 'kindIsIn', target: 'working', actions: ['clearError', 'clearPending'] },
            {
              target: 'idle',
              actions: ['closeDay', 'clearError', 'clearPending'],
            },
          ],
        },
      },

      error: {
        on: {
          RETRY: [
            { guard: 'canRetry', target: 'checking', actions: 'clearError' },
            { target: 'idle', actions: 'reset' },
          ],
          DISMISS: { target: 'idle', actions: 'reset' },
        },
      },
    },
  });
}
