import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import {
  createOfflineQueueMachine,
  enqueue,
  orderedQueued,
  retryDelayMs,
} from './offline-queue.machine.js';

/**
 * Offline queue coverage (Section 7.2): dedupe, ordering, backoff, and the rule
 * that nothing is dropped silently.
 */
const punchIn = {
  id: 'q1',
  idempotencyKey: 'pk_1',
  kind: 'punch',
  clientTs: '2026-10-09T03:17:00.000Z',
};
const punchOut = {
  ...punchIn,
  id: 'q2',
  idempotencyKey: 'pk_2',
  clientTs: '2026-10-09T11:30:00.000Z',
};

function makeMachine(flush, initialItems) {
  return createOfflineQueueMachine({ flush, initialItems });
}

function start(machine) {
  const actor = createActor(machine);
  actor.start();
  return actor;
}

describe('offline queue — pure helpers', () => {
  it('enqueue never adds a duplicate idempotency key', () => {
    const once = enqueue([], punchIn);
    const twice = enqueue(once, { ...punchIn, id: 'q9' });
    expect(twice).toHaveLength(1);
    expect(twice[0].attempts).toBe(0);
  });

  it('orderedQueued returns client-time order (punch-out cannot overtake punch-in)', () => {
    const items = [punchOut, punchIn].map((i) => ({ ...i, status: 'queued' }));
    expect(orderedQueued(items).map((i) => i.id)).toEqual(['q1', 'q2']);
  });

  it('orderedQueued skips sent and needs_attention items', () => {
    expect(orderedQueued([{ ...punchIn, status: 'sent' }])).toHaveLength(0);
    expect(orderedQueued([{ ...punchIn, status: 'needs_attention' }])).toHaveLength(0);
  });

  it('retryDelayMs backs off exponentially and caps at 10 minutes', () => {
    expect(retryDelayMs(1)).toBe(1_000);
    expect(retryDelayMs(2)).toBe(2_000);
    expect(retryDelayMs(3)).toBe(4_000);
    expect(retryDelayMs(20)).toBe(600_000);
  });
});

describe('offline queue — transitions', () => {
  it('starts online and accepts items', () => {
    const actor = start(makeMachine(vi.fn()));
    actor.send({ type: 'ENQUEUE', item: punchIn });
    expect(actor.getSnapshot().context.items).toHaveLength(1);
  });

  it('GO_OFFLINE ⇄ GO_ONLINE tracks connectivity', () => {
    const actor = start(makeMachine(vi.fn()));
    actor.send({ type: 'GO_OFFLINE' });
    expect(actor.getSnapshot().matches('offline')).toBe(true);
    expect(actor.getSnapshot().context.online).toBe(false);
    actor.send({ type: 'GO_ONLINE' });
    expect(actor.getSnapshot().matches('online')).toBe(true);
    expect(actor.getSnapshot().context.online).toBe(true);
  });

  it('FLUSH sends queued items in order and marks them sent', async () => {
    const flush = vi
      .fn()
      .mockImplementation(async (items) => ({ sent: items.map((i) => i.id), failed: [] }));
    const actor = start(makeMachine(flush));
    actor.send({ type: 'ENQUEUE', item: punchOut });
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'FLUSH' });
    expect(actor.getSnapshot().matches('flushing')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('online')).toBe(true));
    expect(flush.mock.calls[0][0].map((i) => i.id)).toEqual(['q1', 'q2']);
    expect(actor.getSnapshot().context.items.every((i) => i.status === 'sent')).toBe(true);
  });

  it('reconnecting online flushes the queue automatically', async () => {
    const flush = vi
      .fn()
      .mockImplementation(async (items) => ({ sent: items.map((i) => i.id), failed: [] }));
    const actor = start(makeMachine(flush));
    actor.send({ type: 'GO_OFFLINE' });
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'GO_ONLINE' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('online')).toBe(true));
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('a network failure keeps items queued and stops claiming connectivity', async () => {
    const flush = vi.fn().mockRejectedValue(new Error('still offline'));
    const actor = start(makeMachine(flush));
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'FLUSH' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('flushFailed')).toBe(true));
    expect(actor.getSnapshot().context.items[0].status).toBe('queued');
    expect(actor.getSnapshot().context.online).toBe(false);
    expect(actor.getSnapshot().context.lastError).toBe('still offline');
  });

  it('reconnecting after a failed flush retries the same items', async () => {
    const flush = vi.fn().mockRejectedValue(new Error('still offline'));
    const actor = start(makeMachine(flush));
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'FLUSH' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('flushFailed')).toBe(true));

    flush.mockResolvedValue({ sent: ['q1'], failed: [] });
    actor.send({ type: 'GO_ONLINE' });
    expect(actor.getSnapshot().matches('flushing')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('online')).toBe(true));
    expect(actor.getSnapshot().context.items[0].status).toBe('sent');
  });

  it('a rejected item surfaces as needs_attention with its reason', async () => {
    const flush = vi
      .fn()
      .mockResolvedValue({ sent: ['q1'], failed: [{ id: 'q2', reason: 'already_clocked_out' }] });
    const actor = start(makeMachine(flush));
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'ENQUEUE', item: punchOut });
    actor.send({ type: 'FLUSH' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('partialFailure')).toBe(true));
    const out = actor.getSnapshot().context.items.find((i) => i.id === 'q2');
    expect(out.status).toBe('needs_attention');
    expect(out.reason).toBe('already_clocked_out');
  });

  it('increments attempts on each send so backoff can be computed', async () => {
    const flush = vi.fn().mockResolvedValue({ sent: [], failed: [{ id: 'q1', reason: 'nope' }] });
    const actor = start(makeMachine(flush));
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'FLUSH' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('partialFailure')).toBe(true));
    actor.send({ type: 'RETRY_FAILED' });
    expect(actor.getSnapshot().matches('flushing')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('partialFailure')).toBe(true));
    expect(actor.getSnapshot().context.items[0].attempts).toBe(2);
  });

  it('DISCARD drops only the chosen needs_attention item', async () => {
    const flush = vi.fn().mockResolvedValue({
      sent: [],
      failed: [
        { id: 'q1', reason: 'a' },
        { id: 'q2', reason: 'b' },
      ],
    });
    const actor = start(makeMachine(flush));
    actor.send({ type: 'ENQUEUE', item: punchIn });
    actor.send({ type: 'ENQUEUE', item: punchOut });
    actor.send({ type: 'FLUSH' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('partialFailure')).toBe(true));
    actor.send({ type: 'DISCARD', id: 'q1' });
    expect(actor.getSnapshot().matches('online')).toBe(true);
    expect(actor.getSnapshot().context.items.map((i) => i.id)).toEqual(['q2']);
  });

  it('an empty queue still settles FLUSH so an awaiting caller never hangs', async () => {
    const flush = vi.fn().mockResolvedValue({ sent: [], failed: [] });
    const actor = start(makeMachine(flush));
    actor.send({ type: 'FLUSH' });
    expect(actor.getSnapshot().matches('flushing')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('online')).toBe(true));
    // the poster receives an empty list, so no request is made per item
    expect(flush.mock.calls[0][0]).toEqual([]);
  });
});
