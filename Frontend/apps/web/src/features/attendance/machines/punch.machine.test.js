import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { createPunchMachine, PUNCH_STATES } from './punch.machine.js';

/**
 * Transition coverage for the punch machine (Section 7.1, ADR 0003: every
 * transition has a unit test). All I/O is stubbed — the machine owns the
 * state logic; the API contract is covered by the mock handler tests.
 */
const never = () => new Promise(() => {});

const record = { id: 'p_1', kind: 'in', at: '2026-10-09T03:17:00.000Z', site: 'Baneshwor' };

function makeMachine(overrides = {}) {
  return createPunchMachine({
    checkPolicy: vi.fn().mockResolvedValue({ decision: 'pass', checks: [] }),
    submitPunch: vi.fn().mockResolvedValue({ record }),
    newKey: () => 'pk_test',
    now: () => new Date('2026-10-09T03:17:00.000Z'),
    ...overrides,
  });
}

function start(machine, input) {
  const actor = createActor(machine, { input });
  actor.start();
  return actor;
}

async function startWorking(overrides = {}) {
  const machine = makeMachine(overrides);
  const actor = start(machine);
  actor.send({ type: 'PUNCH_IN' });
  await vi.waitFor(() => expect(actor.getSnapshot().matches('working')).toBe(true));
  return actor;
}

describe('punch machine — clock in', () => {
  it('idle → checking on PUNCH_IN', () => {
    const actor = start(makeMachine());
    actor.send({ type: 'PUNCH_IN' });
    expect(actor.getSnapshot().matches('checking')).toBe(true);
  });

  it('checking → submitting → working on a clean punch', async () => {
    const actor = await startWorking();
    expect(actor.getSnapshot().context.lastPunch).toEqual(record);
    // only the server record sets the clock (§7.1 guard)
    expect(actor.getSnapshot().context.startedAt).toBe(record.at);
  });

  it('passes the attempt kind and site into the policy check', async () => {
    const checkPolicy = vi.fn().mockResolvedValue({ decision: 'pass' });
    const actor = start(makeMachine({ checkPolicy }), { site: { id: 's1', name: 'Baneshwor' } });
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(checkPolicy).toHaveBeenCalled());
    expect(checkPolicy.mock.calls[0][0]).toMatchObject({ kind: 'in', site: { name: 'Baneshwor' } });
  });

  it('sends the idempotency key and client time to the API', async () => {
    const submitPunch = vi.fn().mockResolvedValue({ record });
    const actor = await startWorking({ submitPunch });
    expect(submitPunch.mock.calls[0][0]).toEqual({
      kind: 'in',
      idempotencyKey: 'pk_test',
      clientTs: '2026-10-09T03:17:00.000Z',
    });
    expect(actor.getSnapshot().matches('working')).toBe(true);
  });
});

describe('punch machine — policy outcomes', () => {
  it('checking → permissionHelp when the policy denies the device', async () => {
    const actor = start(
      makeMachine({ checkPolicy: vi.fn().mockResolvedValue({ decision: 'denied' }) }),
    );
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('permissionHelp')).toBe(true));
  });

  it('checking → permissionHelp when the check itself throws', async () => {
    const actor = start(
      makeMachine({ checkPolicy: vi.fn().mockRejectedValue(new Error('no geolocation')) }),
    );
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('permissionHelp')).toBe(true));
    expect(actor.getSnapshot().context.error.code).toBe('permission_denied');
  });

  it('permissionHelp → checking on RETRY', async () => {
    const checkPolicy = vi
      .fn()
      .mockResolvedValueOnce({ decision: 'denied' })
      .mockResolvedValue({ decision: 'pass' });
    const actor = start(makeMachine({ checkPolicy }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('permissionHelp')).toBe(true));
    actor.send({ type: 'RETRY' });
    expect(actor.getSnapshot().matches('checking')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('working')).toBe(true));
  });

  it('permissionHelp → submitting on PUNCH_ANYWAY when the policy allows override', async () => {
    const actor = start(
      makeMachine({
        checkPolicy: vi
          .fn()
          .mockResolvedValue({ decision: 'denied', allowOverride: true, reason: 'location_off' }),
      }),
    );
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('permissionHelp')).toBe(true));

    actor.send({ type: 'PUNCH_ANYWAY' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('needsReview')).toBe(true));
    // the flagged punch is saved, never blocked
    expect(actor.getSnapshot().context.lastPunch).toEqual(record);
  });

  it('PUNCH_ANYWAY is ignored when the policy does not allow an override', async () => {
    const actor = start(
      makeMachine({ checkPolicy: vi.fn().mockResolvedValue({ decision: 'denied' }) }),
    );
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('permissionHelp')).toBe(true));
    actor.send({ type: 'PUNCH_ANYWAY' });
    expect(actor.getSnapshot().matches('permissionHelp')).toBe(true);
  });

  it('a failed check without override lands in needsReview after submit', async () => {
    const actor = start(
      makeMachine({
        checkPolicy: vi.fn().mockResolvedValue({ decision: 'fail', reason: 'outside' }),
      }),
    );
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('needsReview')).toBe(true));
    expect(actor.getSnapshot().context.needsReviewReason).toBe('outside');
  });

  it('needsReview → working on ACK for a clock-in', async () => {
    const actor = start(
      makeMachine({
        checkPolicy: vi.fn().mockResolvedValue({ decision: 'fail', reason: 'outside' }),
      }),
    );
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('needsReview')).toBe(true));
    actor.send({ type: 'ACK' });
    expect(actor.getSnapshot().matches('working')).toBe(true);
  });
});

describe('punch machine — offline path', () => {
  it('checking → submitting → queued when the network fails', async () => {
    const submitPunch = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('offline'), { offline: true }));
    const actor = start(makeMachine({ submitPunch }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('queued')).toBe(true));
    expect(actor.getSnapshot().context.queuedCount).toBe(1);
    expect(actor.getSnapshot().context.pending.idempotencyKey).toBe('pk_test');
  });

  it('queued → syncing → working when the queue flushes', async () => {
    const submitPunch = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('offline'), { offline: true }));
    const actor = start(makeMachine({ submitPunch }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('queued')).toBe(true));
    actor.send({ type: 'ONLINE' });
    expect(actor.getSnapshot().matches('syncing')).toBe(true);
    actor.send({ type: 'FLUSH_DONE', conflicts: 0 });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('working')).toBe(true));
    expect(actor.getSnapshot().context.queuedCount).toBe(0);
  });

  it('queued → needsReview when the flush reports a conflict', async () => {
    const submitPunch = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('offline'), { offline: true }));
    const actor = start(makeMachine({ submitPunch }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('queued')).toBe(true));
    actor.send({ type: 'SYNC_NOW' });
    expect(actor.getSnapshot().matches('syncing')).toBe(true);
    actor.send({ type: 'FLUSH_DONE', conflicts: 1 });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('needsReview')).toBe(true));
  });

  it('a failed flush returns to queued (never drops the punch)', async () => {
    const submitPunch = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('offline'), { offline: true }));
    const actor = start(makeMachine({ submitPunch }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('queued')).toBe(true));
    actor.send({ type: 'ONLINE' });
    expect(actor.getSnapshot().matches('syncing')).toBe(true);
    actor.send({ type: 'FLUSH_FAILED', error: new Error('still offline') });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('queued')).toBe(true));
    expect(actor.getSnapshot().context.pending.idempotencyKey).toBe('pk_test');
  });
});

describe('punch machine — server rejection', () => {
  it('rejected punch → error with a retry that reuses the same key', async () => {
    const submitPunch = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Already clocked in'), { code: 'conflict' }))
      .mockResolvedValueOnce({ record });
    const actor = start(makeMachine({ submitPunch }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('error')).toBe(true));
    expect(actor.getSnapshot().context.error.message).toBe('Already clocked in');

    actor.send({ type: 'RETRY' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('working')).toBe(true));
    // same key on purpose: the server dedupes, the user never double-punches
    expect(submitPunch.mock.calls[1][0].idempotencyKey).toBe('pk_test');
  });

  it('error → idle on DISMISS', async () => {
    const submitPunch = vi.fn().mockRejectedValue(new Error('Server error'));
    const actor = start(makeMachine({ submitPunch }));
    actor.send({ type: 'PUNCH_IN' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('error')).toBe(true));
    actor.send({ type: 'DISMISS' });
    expect(actor.getSnapshot().matches('idle')).toBe(true);
    expect(actor.getSnapshot().context.error).toBeNull();
  });
});

describe('punch machine — working day', () => {
  it('working ⇄ onBreak records the break segment', async () => {
    const actor = await startWorking();
    actor.send({ type: 'BREAK' });
    expect(actor.getSnapshot().matches('onBreak')).toBe(true);
    expect(actor.getSnapshot().context.breakStartedAt).toBe('2026-10-09T03:17:00.000Z');
    actor.send({ type: 'RESUME' });
    expect(actor.getSnapshot().matches('working')).toBe(true);
    expect(actor.getSnapshot().context.segments).toEqual([
      { start: '2026-10-09T03:17:00.000Z', end: '2026-10-09T03:17:00.000Z' },
    ]);
  });

  it('working → confirmOut → idle on a confirmed clock-out', async () => {
    const outRecord = { ...record, id: 'p_2', kind: 'out', at: '2026-10-09T11:30:00.000Z' };
    const submitPunch = vi
      .fn()
      .mockResolvedValueOnce({ record })
      .mockResolvedValueOnce({ record: outRecord });
    const actor = await startWorking({ submitPunch });

    actor.send({ type: 'PUNCH_OUT' });
    expect(actor.getSnapshot().matches('confirmOut')).toBe(true);

    actor.send({ type: 'PUNCH_OUT' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('idle')).toBe(true));
    expect(actor.getSnapshot().context.startedAt).toBeNull();
    expect(actor.getSnapshot().context.lastPunch.id).toBe('p_2');
  });

  it('confirmOut → working on CANCEL', async () => {
    const actor = await startWorking();
    actor.send({ type: 'PUNCH_OUT' });
    actor.send({ type: 'CANCEL' });
    expect(actor.getSnapshot().matches('working')).toBe(true);
  });

  it('HYDRATE_OPEN resumes an open server session into working', () => {
    const actor = start(makeMachine());
    actor.send({
      type: 'HYDRATE_OPEN',
      session: { startedAt: '2026-10-09T02:00:00.000Z', lastPunch: record, segments: [] },
    });
    expect(actor.getSnapshot().matches('working')).toBe(true);
    expect(actor.getSnapshot().context.startedAt).toBe('2026-10-09T02:00:00.000Z');
  });

  it('SESSION_ENDED returns working to idle', async () => {
    const actor = await startWorking();
    actor.send({ type: 'SESSION_ENDED' });
    expect(actor.getSnapshot().matches('idle')).toBe(true);
  });
});

describe('punch machine — shape', () => {
  it('exposes every documented state exactly once', () => {
    expect(PUNCH_STATES).toHaveLength(new Set(PUNCH_STATES).size);
    expect(PUNCH_STATES).toContain('queued');
    expect(PUNCH_STATES).toContain('permissionHelp');
  });

  it('a machine with no I/O still starts in idle', () => {
    const actor = start(
      createPunchMachine({
        checkPolicy: never,
        submitPunch: never,
      }),
    );
    expect(actor.getSnapshot().matches('idle')).toBe(true);
  });
});
