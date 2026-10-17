import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { createSessionMachine } from './session.machine.js';

/**
 * Transition coverage for the session machine (Section 7.3, ADR 0003:
 * every transition has a unit test). All I/O is stubbed — the machine
 * owns state logic, not network.
 */
const session = {
  user: { id: 'u_sita', name: 'Sita Shrestha' },
  principal: { id: 'u_sita', role: 'hr' },
  entitlements: ['attendance'],
};

const credentials = { email: 'sita@himaldigital.com.np', password: 'correct-horse-1' };

/** A promise that never settles — holds the machine in its invoked state. */
const never = () => new Promise(() => {});

function makeMachine(overrides = {}) {
  return createSessionMachine({
    // Defaults hold the invoked state forever (no accidental transitions).
    restore: vi.fn(never),
    signIn: vi.fn(never),
    verifyMfa: vi.fn(never),
    signOut: vi.fn(never),
    // Long delays by default so tests that assert `authenticated` are not
    // racing the soft-warning → expiring → refreshing cycle; the timing test
    // overrides these.
    timing: { softWarningMs: 60_000, graceMs: 60_000 },
    ...overrides,
  });
}

function start(machine, snapshot) {
  const actor = createActor(machine);
  actor.start();
  if (snapshot) actor.send(snapshot);
  return actor;
}

/** Drive the machine from boot to anonymous (restore fails = signed out). */
async function startAnonymous() {
  const machine = makeMachine({
    restore: vi.fn().mockRejectedValue(new Error('no cookie')),
  });
  const actor = createActor(machine, { input: {} });
  actor.start();
  // Events sent during `refreshing` are not handled (by design); wait for
  // `anonymous` before driving sign-in transitions.
  await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
  return actor;
}

describe('session machine — boot', () => {
  it('unknown → refreshing → authenticated when the cookie restores', () => {
    const restore = vi.fn().mockResolvedValue({ session });
    const actor = start(makeMachine({ restore }));
    expect(actor.getSnapshot().matches('refreshing')).toBe(true);
  });

  it('refreshing → authenticated on restore success', async () => {
    const restore = vi.fn().mockResolvedValue({ session });
    const actor = start(makeMachine({ restore }));
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authenticated')).toBe(true));
    expect(actor.getSnapshot().context.session).toEqual(session);
  });

  it('refreshing → anonymous on restore failure (signed out)', async () => {
    const actor = await startAnonymous();
    expect(actor.getSnapshot().context.lastError).toBeTruthy();
  });
});

describe('session machine — sign in', () => {
  it('anonymous → authenticating on SIGN_IN', async () => {
    const actor = await startAnonymous();
    actor.send({ type: 'SIGN_IN', credentials });
    expect(actor.getSnapshot().matches('authenticating')).toBe(true);
  });

  it('authenticating → authenticated on success', async () => {
    const signIn = vi.fn().mockResolvedValue({ session });
    const actor = start(
      makeMachine({ restore: vi.fn().mockRejectedValue(new Error('x')), signIn }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authenticated')).toBe(true));
    expect(actor.getSnapshot().context.session).toEqual(session);
  });

  it('authenticating → mfaRequired when the server demands MFA', async () => {
    const signIn = vi.fn().mockResolvedValue({ mfaRequired: true });
    const actor = start(
      makeMachine({ restore: vi.fn().mockRejectedValue(new Error('x')), signIn }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('mfaRequired')).toBe(true));
  });

  it('authenticating → anonymous on failure with the error stored', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('bad credentials'));
    const actor = start(
      makeMachine({ restore: vi.fn().mockRejectedValue(new Error('x')), signIn }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    expect(actor.getSnapshot().context.lastError).toBeTruthy();
  });
});

describe('session machine — MFA', () => {
  async function atMfa(signInResult = { mfaRequired: true }) {
    const signIn = vi.fn().mockResolvedValue(signInResult);
    const verifyMfa = vi.fn().mockResolvedValue({ session });
    const actor = start(
      makeMachine({ restore: vi.fn().mockRejectedValue(new Error('x')), signIn, verifyMfa }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('mfaRequired')).toBe(true));
    return { actor, verifyMfa };
  }

  it('mfaRequired → verifying on VERIFY_MFA', async () => {
    const { actor } = await atMfa();
    actor.send({ type: 'VERIFY_MFA', challenge: { code: '123456' } });
    expect(actor.getSnapshot().matches('verifying')).toBe(true);
  });

  it('verifying → authenticated on success', async () => {
    const { actor } = await atMfa();
    actor.send({ type: 'VERIFY_MFA', challenge: { code: '123456' } });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authenticated')).toBe(true));
  });

  it('verifying → mfaRequired on a wrong code (error stored, stay in challenge)', async () => {
    const verifyMfa = vi.fn().mockRejectedValue(new Error('invalid code'));
    const signIn = vi.fn().mockResolvedValue({ mfaRequired: true });
    const actor = start(
      makeMachine({ restore: vi.fn().mockRejectedValue(new Error('x')), signIn, verifyMfa }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('mfaRequired')).toBe(true));
    actor.send({ type: 'VERIFY_MFA', challenge: { code: '000000' } });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('mfaRequired')).toBe(true));
    expect(actor.getSnapshot().context.lastError).toBeTruthy();
  });

  it('CANCEL_MFA returns to anonymous (use another account)', async () => {
    const { actor } = await atMfa();
    actor.send({ type: 'CANCEL_MFA' });
    expect(actor.getSnapshot().matches('anonymous')).toBe(true);
  });
});

describe('session machine — expiring and ending', () => {
  async function authenticated(timing) {
    const restore = vi.fn().mockResolvedValue({ session });
    const actor = start(makeMachine({ restore, timing }));
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authenticated')).toBe(true));
    return actor;
  }

  it('authenticated → expiring after the soft-warning delay, then refreshing', async () => {
    // First restore resolves (boot); the second (post-expiry refresh) is held
    // pending so the `refreshing` state is observable, not a 1ms blip.
    let releaseRefresh;
    const restore = vi
      .fn()
      .mockResolvedValueOnce({ session })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseRefresh = resolve;
          }),
      );
    const machine = makeMachine({ restore, timing: { softWarningMs: 50, graceMs: 400 } });
    const actor = createActor(machine);
    actor.start();

    await vi.waitFor(() => expect(actor.getSnapshot().matches('expiring')).toBe(true), {
      timeout: 500,
    });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('refreshing')).toBe(true), {
      timeout: 1_000,
    });

    // Refresh re-issues the session → authenticated again.
    releaseRefresh({ session });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authenticated')).toBe(true), {
      timeout: 1_000,
    });
  });

  it('expiring → refreshing on REFRESHED (user/transport nudged refresh)', async () => {
    let releaseRefresh;
    const restore = vi
      .fn()
      .mockResolvedValueOnce({ session })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseRefresh = resolve;
          }),
      );
    const machine = makeMachine({ restore, timing: { softWarningMs: 50, graceMs: 60_000 } });
    const actor = createActor(machine);
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('expiring')).toBe(true), {
      timeout: 500,
    });
    actor.send({ type: 'REFRESHED' });
    expect(actor.getSnapshot().matches('refreshing')).toBe(true);
    releaseRefresh({ session });
  });

  it('SESSION_ENDED from authenticated lands in sessionEnded (drafts, return-to-route)', async () => {
    const actor = await authenticated();
    actor.send({ type: 'SESSION_ENDED' });
    expect(actor.getSnapshot().matches('sessionEnded')).toBe(true);
    expect(actor.getSnapshot().context.session).toBeNull();
  });

  it('sessionEnded → authenticating on a fresh SIGN_IN', async () => {
    const actor = await authenticated();
    actor.send({ type: 'SESSION_ENDED' });
    actor.send({ type: 'SIGN_IN', credentials });
    expect(actor.getSnapshot().matches('authenticating')).toBe(true);
  });

  it('authenticated → signingOut → anonymous even if the sign-out request fails', async () => {
    const signOut = vi.fn().mockRejectedValue(new Error('network down'));
    const machine = makeMachine({
      restore: vi.fn().mockResolvedValue({ session }),
      signOut,
    });
    const actor = createActor(machine);
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('authenticated')).toBe(true));
    actor.send({ type: 'SIGN_OUT' });
    expect(actor.getSnapshot().matches('signingOut')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    expect(actor.getSnapshot().context.lastError).toBeTruthy();
  });

  it('restore resolving without a session → anonymous with a lastError (never authenticates)', async () => {
    const restore = vi.fn().mockResolvedValue({});
    const actor = start(
      makeMachine({ restore, timing: { softWarningMs: 60_000, graceMs: 60_000 } }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    expect(actor.getSnapshot().context.lastError).toBeTruthy();
    expect(actor.getSnapshot().context.lastError.message).toContain(
      'restore/verify/signIn completed without a session output',
    );
  });

  it('signIn resolving without a session → anonymous with a lastError (never authenticates)', async () => {
    const restore = vi.fn().mockRejectedValue(new Error('no cookie'));
    const signIn = vi.fn().mockResolvedValue({});
    const actor = start(
      makeMachine({ restore, signIn, timing: { softWarningMs: 60_000, graceMs: 60_000 } }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() =>
      expect(actor.getSnapshot().context.lastError?.message).toContain(
        'completed without a session output',
      ),
    );
    expect(actor.getSnapshot().matches('authenticated')).toBe(false);
    expect(actor.getSnapshot().context.session).toBeNull();
  });

  it('verifyMfa resolving without a session → mfaRequired with a lastError', async () => {
    const restore = vi.fn().mockRejectedValue(new Error('no cookie'));
    const signIn = vi.fn().mockResolvedValue({ mfaRequired: true });
    const verifyMfa = vi.fn().mockResolvedValue({});
    const actor = start(
      makeMachine({
        restore,
        signIn,
        verifyMfa,
        timing: { softWarningMs: 60_000, graceMs: 60_000 },
      }),
    );
    await vi.waitFor(() => expect(actor.getSnapshot().matches('anonymous')).toBe(true));
    actor.send({ type: 'SIGN_IN', credentials });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('mfaRequired')).toBe(true));

    actor.send({ type: 'VERIFY_MFA', challenge: { code: '123456', portal: 'staff' } });
    await vi.waitFor(() =>
      expect(actor.getSnapshot().context.lastError?.message).toContain(
        'completed without a session output',
      ),
    );
    // stays in the MFA flow: the user can retry the code instead of being
    // half-authenticated with no session.
    expect(actor.getSnapshot().matches('mfaRequired')).toBe(true);
    expect(actor.getSnapshot().matches('authenticated')).toBe(false);
  });
});
