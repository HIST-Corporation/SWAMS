import { assign, fromPromise, setup } from 'xstate';

/**
 * Session machine (Section 7.3, ADR 0003):
 *
 *   unknown → refreshing → authenticated | anonymous
 *   anonymous → authenticating → authenticated | mfaRequired | anonymous
 *   mfaRequired → verifying → authenticated | mfaRequired
 *   authenticated → expiring (soft warning) → refreshing
 *   refreshing failure → sessionEnded → (login again) authenticating
 *
 * Components render from `matches(...)`; server rules stay on the server.
 * All I/O is injected via input (restore/signIn/verifyMfa/signOut) so tests
 * walk every transition without network. `delays` are dynamic (context-driven)
 * so tests can shrink them.
 *
 * @param {object} input
 * @param {() => Promise<{ session: object }>} input.restore   refresh-cookie restore
 * @param {(c: object) => Promise<{ mfaRequired?: boolean, session?: object }>} input.signIn
 * @param {(c: object) => Promise<{ session: object }>} input.verifyMfa
 * @param {() => Promise<void>} input.signOut
 * @param {{ softWarningMs?: number, graceMs?: number }} [input.timing]
 */
export const createSessionMachine = ({ restore, signIn, verifyMfa, signOut, timing = {} } = {}) =>
  setup({
    types: {
      context: {},
      events: {},
      input: {},
    },
    actors: {
      restore: fromPromise(() => restore()),
      signIn: fromPromise(({ input }) => signIn(input.credentials)),
      verifyMfa: fromPromise(({ input }) => verifyMfa(input.challenge)),
      signOut: fromPromise(() => signOut()),
    },
    delays: {
      softWarning: ({ context }) => context.softWarningMs,
      grace: ({ context }) => context.graceMs,
    },
    actions: {
      storeSession: assign(({ event }) => {
        const session = event.output?.session;
        if (!session) {
          return {
            lastError: new Error(
              'session machine: restore/verify/signIn completed without a session output',
            ),
          };
        }
        return { session, lastError: null };
      }),
      storeError: assign(({ event }) => ({ lastError: event.error })),
    },
    guards: {
      needsMfa: ({ event }) => event.output.mfaRequired === true,
      /**
       * Never authenticate without a session payload. A resolve with no
       * `session` is a broken/partial response — it must not sign the user in.
       */
      hasSession: ({ event }) => Boolean(event.output?.session),
    },
  }).createMachine({
    id: 'session',
    context: () => ({
      session: null,
      lastError: null,
      credentials: null,
      portal: null,
      softWarningMs: timing.softWarningMs ?? 4 * 60_000,
      graceMs: timing.graceMs ?? 60_000,
    }),
    initial: 'unknown',
    states: {
      unknown: {
        // Boot: always try the refresh cookie first (7.3 "refreshing" on load).
        always: [{ target: 'refreshing' }],
      },

      refreshing: {
        invoke: {
          src: 'restore',
          input: () => ({}),
          onDone: [
            { guard: 'hasSession', target: 'authenticated', actions: 'storeSession' },
            { target: 'anonymous', actions: 'storeSession' },
          ],
          onError: [{ target: 'anonymous', actions: 'storeError' }],
        },
        // A hard 401 during restore lands in sessionEnded (drafts preserved,
        // return-to-route after login).
        on: { SESSION_ENDED: 'sessionEnded' },
      },

      anonymous: {
        entry: assign({ session: null, credentials: null }),
        on: {
          SIGN_IN: {
            target: 'authenticating',
            actions: assign(({ event }) => ({
              credentials: event.credentials,
              portal: event.portal,
            })),
          },
        },
      },

      authenticating: {
        invoke: {
          src: 'signIn',
          input: ({ context }) => ({ credentials: context.credentials }),
          onDone: [
            { guard: 'needsMfa', target: 'mfaRequired' },
            { guard: 'hasSession', target: 'authenticated', actions: 'storeSession' },
            { target: 'anonymous', actions: 'storeSession' },
          ],
          onError: [{ target: 'anonymous', actions: 'storeError' }],
        },
        on: { SESSION_ENDED: 'sessionEnded' },
      },

      mfaRequired: {
        on: {
          VERIFY_MFA: {
            target: 'verifying',
            actions: assign(({ event }) => ({ credentials: event.challenge })),
          },
          CANCEL_MFA: 'anonymous',
        },
      },

      verifying: {
        invoke: {
          src: 'verifyMfa',
          input: ({ context }) => ({ challenge: context.credentials }),
          onDone: [
            { guard: 'hasSession', target: 'authenticated', actions: 'storeSession' },
            { target: 'mfaRequired', actions: 'storeSession' },
          ],
          onError: [{ target: 'mfaRequired', actions: 'storeError' }],
        },
        on: { SESSION_ENDED: 'sessionEnded' },
      },

      authenticated: {
        after: { softWarning: 'expiring' },
        on: {
          SIGN_OUT: 'signingOut',
          SESSION_ENDED: 'sessionEnded',
          EXPIRED: 'expiring',
        },
      },

      expiring: {
        // Soft warning is visible; the next tick silently refreshes.
        after: { grace: 'refreshing' },
        on: { REFRESHED: 'refreshing', SESSION_ENDED: 'sessionEnded' },
      },

      signingOut: {
        invoke: {
          src: 'signOut',
          onDone: [{ target: 'anonymous' }],
          // Even a failed sign-out request must end the local session.
          onError: [{ target: 'anonymous', actions: 'storeError' }],
        },
      },

      sessionEnded: {
        // Drafts and route return are the provider's job (returnTo); the
        // machine only guarantees we never silently swallow the end.
        entry: assign({ session: null, lastError: null }),
        on: {
          SIGN_IN: {
            target: 'authenticating',
            actions: assign(({ event }) => ({
              credentials: event.credentials,
              portal: event.portal,
            })),
          },
        },
      },
    },
  });
