import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { createCorrectionMachine, CORRECTION_STATES } from './correction.machine.js';

/**
 * Correction coverage (Section 7.5): the requester path, the reviewer path, the
 * "needs more info" loop, and the rule that a decision is never mirrored before
 * the server confirms it.
 */
const original = { id: 'punch_9', clockIn: null, clockOut: '13:20', date: '2026-10-04' };
const validPatch = { clockIn: '09:05', clockOut: '17:10', reason: 'Forgot to punch in.' };

const never = () => new Promise(() => {});

function makeMachine(overrides = {}) {
  return createCorrectionMachine({
    submitCorrection: vi.fn().mockResolvedValue({ id: 'corr_1', status: 'inReview' }),
    decideCorrection: vi.fn().mockResolvedValue({ record: { status: 'approved' } }),
    initial: { original },
    ...overrides,
  });
}

function start(machine) {
  const actor = createActor(machine);
  actor.start();
  return actor;
}

async function startInReview(machine = makeMachine()) {
  const actor = start(machine);
  actor.send({ type: 'EDIT', patch: validPatch });
  actor.send({ type: 'SUBMIT' });
  await vi.waitFor(() => expect(actor.getSnapshot().matches('inReview')).toBe(true));
  return actor;
}

describe('correction machine — requester', () => {
  it('starts in draft and edits the proposed change', () => {
    const actor = start(makeMachine());
    expect(actor.getSnapshot().matches('draft')).toBe(true);
    actor.send({ type: 'EDIT', patch: { clockIn: '09:05' } });
    expect(actor.getSnapshot().context.proposed.clockIn).toBe('09:05');
  });

  it('refuses to submit without both times and a real reason', () => {
    const actor = start(makeMachine());
    actor.send({ type: 'SUBMIT' });
    expect(actor.getSnapshot().matches('draft')).toBe(true);

    actor.send({ type: 'EDIT', patch: { clockIn: '09:05', clockOut: '17:10', reason: 'oops' } });
    actor.send({ type: 'SUBMIT' });
    expect(actor.getSnapshot().matches('draft')).toBe(true);
  });

  it('sends the original punch and the proposal to the API', async () => {
    const submitCorrection = vi.fn().mockResolvedValue({ id: 'corr_1', status: 'inReview' });
    const actor = await startInReview(makeMachine({ submitCorrection }));
    expect(submitCorrection.mock.calls[0][0]).toMatchObject({
      original,
      proposed: validPatch,
      reason: validPatch.reason,
    });
    expect(actor.getSnapshot().context.id).toBe('corr_1');
  });

  it('a rejected submission lands in error with a retry that keeps the draft', async () => {
    const submitCorrection = vi
      .fn()
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce({ id: 'corr_2', status: 'inReview' });
    const actor = start(makeMachine({ submitCorrection }));
    actor.send({ type: 'EDIT', patch: validPatch });
    actor.send({ type: 'SUBMIT' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('error')).toBe(true));
    expect(actor.getSnapshot().context.proposed).toEqual(validPatch);

    actor.send({ type: 'RETRY' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('inReview')).toBe(true));
  });

  it('can withdraw a request that is still in review', async () => {
    const actor = await startInReview();
    actor.send({ type: 'WITHDRAW' });
    expect(actor.getSnapshot().matches('draft')).toBe(true);
    expect(actor.getSnapshot().context.proposed).toEqual({ clockIn: '', clockOut: '', reason: '' });
  });
});

describe('correction machine — reviewer', () => {
  it('approving goes through the server before the record is marked approved', async () => {
    const decideCorrection = vi.fn().mockResolvedValue({ record: { status: 'approved' } });
    const actor = await startInReview(makeMachine({ decideCorrection }));

    actor.send({ type: 'START_REVIEW' });
    expect(actor.getSnapshot().matches('deciding')).toBe(true);

    actor.send({ type: 'DECISION', decision: 'approve' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('approved')).toBe(true));
    expect(decideCorrection.mock.calls[0][0]).toMatchObject({ id: 'corr_1', decision: 'approve' });
    expect(actor.getSnapshot().context.status).toBe('approved');
  });

  it('rejecting carries the reviewer note', async () => {
    const decideCorrection = vi
      .fn()
      .mockResolvedValue({ record: { status: 'rejected', note: 'Wrong site.' } });
    const actor = await startInReview(makeMachine({ decideCorrection }));
    actor.send({ type: 'START_REVIEW' });
    actor.send({ type: 'DECISION', decision: 'reject', note: 'Wrong site.' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('rejected')).toBe(true));
    expect(actor.getSnapshot().context.reviewerNote).toBe('Wrong site.');
  });

  it('asking for information pins the question and reopens the draft', async () => {
    const decideCorrection = vi
      .fn()
      .mockResolvedValue({ record: { status: 'needs_info', note: 'Which site?' } });
    const actor = await startInReview(makeMachine({ decideCorrection }));
    actor.send({ type: 'START_REVIEW' });
    actor.send({ type: 'DECISION', decision: 'request_info', note: 'Which site?' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('needsInfo')).toBe(true));
    expect(actor.getSnapshot().context.reviewerNote).toBe('Which site?');

    actor.send({ type: 'EDIT' });
    expect(actor.getSnapshot().matches('draft')).toBe(true);
    expect(actor.getSnapshot().context.reviewerNote).toBe('Which site?');
  });

  it('a failed decision retries the decision, not the submission', async () => {
    const decideCorrection = vi.fn().mockRejectedValue(new Error('Still locked'));
    const actor = await startInReview(makeMachine({ decideCorrection }));
    actor.send({ type: 'START_REVIEW' });
    actor.send({ type: 'DECISION', decision: 'approve' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('error')).toBe(true));
    expect(decideCorrection).toHaveBeenCalledTimes(1);

    actor.send({ type: 'RETRY' });
    // it retries the *decision*; the submission actor is never invoked again
    await vi.waitFor(() => expect(decideCorrection).toHaveBeenCalledTimes(2));
    expect(decideCorrection.mock.calls[1][0]).toMatchObject({ decision: 'approve' });
  });

  it('cancelling a review returns to inReview without a decision', async () => {
    const actor = await startInReview();
    actor.send({ type: 'START_REVIEW' });
    actor.send({ type: 'CANCEL' });
    expect(actor.getSnapshot().matches('inReview')).toBe(true);
    expect(actor.getSnapshot().context.decision).toBeNull();
  });
});

describe('correction machine — shape', () => {
  it('exposes every documented state exactly once', () => {
    expect(CORRECTION_STATES).toHaveLength(new Set(CORRECTION_STATES).size);
    expect(CORRECTION_STATES).toContain('needsInfo');
  });

  it('hydrating an existing record starts in review with its proposal', () => {
    const machine = createCorrectionMachine({
      submitCorrection: never,
      decideCorrection: never,
      initial: {
        original,
        record: {
          id: 'corr_9',
          status: 'in_review',
          proposed: { clockIn: '09:00', clockOut: '17:00', reason: 'Missed punch' },
          note: null,
        },
      },
    });
    const actor = createActor(machine);
    actor.start();
    actor.send({ type: 'START_REVIEW' });
    // `initial.status` is reported to the caller; the machine models the reviewer bench
    expect(actor.getSnapshot().matches('deciding')).toBe(true);
    expect(actor.getSnapshot().context.proposed.clockIn).toBe('09:00');
  });
});
