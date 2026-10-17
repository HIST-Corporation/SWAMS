import { assign, fromPromise, setup } from 'xstate';

/**
 * Org setup wizard machine (build order 2; Section 7 wizard workflow):
 *
 *   editing.step1 (org basics) → step2 (sites) → step3 (BS calendar +
 *   fiscal year) → reviewing → submitting → done
 *        ↺ BACK between steps          ↘ error → reviewing (retry)
 *
 * All I/O (submit) is injected so tests drive every transition without
 * network. Server rules stay on the server; this machine models the flow.
 *
 * @param {(draft: object) => Promise<{ org: object }>} submit
 */
export const createOrgSetupMachine = (submit) =>
  setup({
    types: { context: {}, events: {}, input: {} },
    actors: {
      submit: fromPromise(({ input }) => submit(input.draft)),
    },
    actions: {
      updateDraft: assign(({ context, event }) => ({
        draft: { ...context.draft, ...event.patch },
      })),
      markAttempted: assign({ attempted: true }),
      clearAttempted: assign({ attempted: false }),
      storeResult: assign(({ event }) => ({ org: event.output.org, lastError: null })),
      storeError: assign(({ event }) => ({ lastError: event.error })),
    },
    guards: {
      hasName: ({ context }) => context.draft.name.trim().length > 0,
      hasSite: ({ context }) => context.draft.sites.length > 0,
      hasFiscalYear: ({ context }) => /^\d{2}-\d{2}$/.test(context.draft.fiscalYearStart),
    },
  }).createMachine({
    id: 'orgSetup',
    context: ({ input }) => ({
      draft: {
        name: input?.initialDraft?.name ?? '',
        timezone: input?.initialDraft?.timezone ?? 'Asia/Kathmandu',
        sites: input?.initialDraft?.sites ?? [],
        calendar: input?.initialDraft?.calendar ?? 'bs',
        fiscalYearStart: input?.initialDraft?.fiscalYearStart ?? '07-16',
      },
      org: null,
      lastError: null,
      // Inline errors show only after a failed Continue (states before happy
      // path, but never red fields on first paint).
      attempted: false,
    }),
    initial: 'editing',
    states: {
      editing: {
        on: {
          UPDATE: { actions: 'updateDraft' },
        },
        initial: 'step1',
        states: {
          step1: {
            on: {
              NEXT: [
                { guard: 'hasName', target: 'step2', actions: 'clearAttempted' },
                { actions: 'markAttempted' },
              ],
            },
          },
          step2: {
            on: {
              BACK: { target: 'step1', actions: 'clearAttempted' },
              NEXT: [
                { guard: 'hasSite', target: 'step3', actions: 'clearAttempted' },
                { actions: 'markAttempted' },
              ],
            },
          },
          step3: {
            on: {
              BACK: { target: 'step2', actions: 'clearAttempted' },
              // Absolute target: 'reviewing' is a sibling of `editing`.
              NEXT: [
                {
                  guard: 'hasFiscalYear',
                  target: '#orgSetup.reviewing',
                  actions: 'clearAttempted',
                },
                { actions: 'markAttempted' },
              ],
            },
          },
        },
      },
      reviewing: {
        on: {
          BACK: { target: 'editing.step3', actions: 'clearAttempted' },
          SUBMIT: 'submitting',
        },
      },
      submitting: {
        invoke: {
          src: 'submit',
          input: ({ context }) => ({ draft: context.draft }),
          onDone: [{ target: 'done', actions: 'storeResult' }],
          onError: [{ target: 'reviewing', actions: 'storeError' }],
        },
      },
      done: {
        type: 'final',
      },
    },
  });

/**
 * Per-step validation shared by the machine guards and the UI so both fail
 * the same way. Returns error keys (i18n: `wizard.error.*`).
 * @param {object} draft
 * @param {1|2|3} step
 * @returns {Record<string, string>}
 */
export function wizardStepErrors(draft, step) {
  const all = {};
  if (!draft.name.trim()) all.name = 'wizard.error.nameRequired';
  if (draft.sites.length === 0) all.sites = 'wizard.error.siteRequired';
  if (!/^\d{2}-\d{2}$/.test(draft.fiscalYearStart)) {
    all.fiscalYearStart = 'wizard.error.fiscalYearFormat';
  }
  if (step === 1) return all.name ? { name: all.name } : {};
  if (step === 2) return all.sites ? { sites: all.sites } : {};
  if (step === 3) return all.fiscalYearStart ? { fiscalYearStart: all.fiscalYearStart } : {};
  return all;
}
