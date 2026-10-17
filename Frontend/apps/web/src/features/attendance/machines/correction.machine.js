import { assign, fromPromise, setup } from 'xstate';

/**
 * Attendance correction machine (Section 7.5).
 *
 *   requester:  draft → submitting → inReview
 *   reviewer:   inReview → deciding → committing → approved | rejected | needsInfo
 *   needsInfo:  back to draft with the reviewer's question pinned
 *
 * One machine for both sides of the same record: the requester sees `draft`
 * and `inReview`, the reviewer sees `deciding`. The decision is only mirrored
 * after the server confirms it, and the UI always renders the original punch
 * beside the proposed change, so nobody approves a value they cannot see
 * (§7.5, §14).
 *
 * All I/O is injected; components render from `matches(...)`.
 *
 * @param {object} input
 * @param {(input: {original: object, proposed: object, reason: string}) => Promise<{id: string, status: string}>} input.submitCorrection
 * @param {(input: {id: string, decision: 'approve'|'reject'|'request_info', note?: string}) => Promise<{record: object}>} input.decideCorrection
 * @param {{ original?: object, record?: object }} [input.initial]
 */

export const CORRECTION_STATES = /** @type {const} */ ([
  'draft',
  'submitting',
  'inReview',
  'deciding',
  'committing',
  'needsInfo',
  'approved',
  'rejected',
  'error',
]);

const EMPTY_PROPOSED = { clockIn: '', clockOut: '', reason: '' };

/** Server statuses that mean "a reviewer still has to act" (§7.5). */
const REVIEWABLE = ['in_review', 'inReview', 'pending'];

/** Resume from whatever the server says the record already is. */
function initialStateFor(status) {
  if (REVIEWABLE.includes(status)) return 'inReview';
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'needs_info') return 'needsInfo';
  return 'draft';
}

export function createCorrectionMachine({ submitCorrection, decideCorrection, initial = {} } = {}) {
  return setup({
    types: { context: {}, events: {}, input: {} },
    actors: {
      submitCorrection: fromPromise(({ input }) => submitCorrection(input)),
      decideCorrection: fromPromise(({ input }) => decideCorrection(input)),
    },
    actions: {
      editProposed: assign(({ context, event }) => ({
        proposed: { ...context.proposed, ...event.patch },
        error: null,
      })),
      storeSubmitted: assign(({ event }) => ({
        id: event.output?.id ?? null,
        status: event.output?.status ?? 'inReview',
        error: null,
      })),
      storeDecision: assign(({ context, event }) => {
        const record = event.output?.record ?? {};
        return {
          status: record.status ?? context.status,
          reviewerNote: record.note ?? context.reviewerNote,
          error: null,
        };
      }),
      storeError: assign(({ event }) => ({ error: event.error })),
      clearError: assign({ error: null }),
      reset: assign(() => ({
        proposed: { ...EMPTY_PROPOSED },
        error: null,
        reviewerNote: null,
        decision: null,
      })),
    },
    guards: {
      canSubmit: ({ context }) => {
        const { clockIn, clockOut, reason } = context.proposed;
        return Boolean(clockIn) && Boolean(clockOut) && (reason ?? '').trim().length >= 5;
      },
      isApprove: ({ context }) => context.decision === 'approve',
      isReject: ({ context }) => context.decision === 'reject',
      isRequestInfo: ({ context }) => context.decision === 'request_info',
    },
  }).createMachine({
    id: 'correction',
    context: () => ({
      id: initial.record?.id ?? null,
      original: initial.original ?? initial.record?.original ?? null,
      proposed: { ...EMPTY_PROPOSED, ...(initial.record?.proposed ?? {}) },
      reviewerNote: initial.record?.note ?? null,
      decision: null,
      status: initial.record?.status ?? 'draft',
      error: null,
    }),
    initial: initialStateFor(initial.record?.status),
    states: {
      draft: {
        on: {
          EDIT: { actions: 'editProposed' },
          SUBMIT: { target: 'submitting', guard: 'canSubmit' },
          CANCEL: { actions: 'reset' },
        },
      },

      submitting: {
        invoke: {
          src: 'submitCorrection',
          input: ({ context }) => ({
            original: context.original,
            proposed: context.proposed,
            reason: context.proposed.reason,
          }),
          onDone: [{ target: 'inReview', actions: 'storeSubmitted' }],
          onError: [{ target: 'error', actions: 'storeError' }],
        },
      },

      /** Saved on the server, awaiting a reviewer. */
      inReview: {
        on: {
          /** Permission-gated: the staff UI never shows this. */
          START_REVIEW: { target: 'deciding' },
          WITHDRAW: { target: 'draft', actions: 'reset' },
        },
      },

      deciding: {
        on: {
          DECISION: {
            target: 'committing',
            actions: assign(({ event }) => ({
              decision: event.decision,
              reviewerNote: event.note ?? null,
            })),
          },
          CANCEL: 'inReview',
        },
      },

      /** The decision is only mirrored once the server accepts it. */
      committing: {
        invoke: {
          src: 'decideCorrection',
          input: ({ context }) => ({
            id: context.id,
            decision: context.decision,
            note: context.reviewerNote ?? undefined,
          }),
          onDone: [
            { guard: 'isApprove', target: 'approved', actions: 'storeDecision' },
            { guard: 'isReject', target: 'rejected', actions: 'storeDecision' },
            { target: 'needsInfo', actions: 'storeDecision' },
          ],
          onError: [{ target: 'error', actions: 'storeError' }],
        },
      },

      needsInfo: {
        on: {
          EDIT: { target: 'draft', actions: 'editProposed' },
          CANCEL: { target: 'draft' },
        },
      },

      approved: { on: { RESET: 'draft' } },
      rejected: { on: { RESET: 'draft' } },

      error: {
        on: {
          RETRY: [
            // A failed decision retries the decision, never the submission.
            { guard: 'isApprove', target: 'committing', actions: 'clearError' },
            { guard: 'isReject', target: 'committing', actions: 'clearError' },
            { guard: 'isRequestInfo', target: 'committing', actions: 'clearError' },
            { target: 'submitting', actions: 'clearError' },
          ],
          DISMISS: { target: 'draft', actions: 'reset' },
        },
      },
    },
  });
}
