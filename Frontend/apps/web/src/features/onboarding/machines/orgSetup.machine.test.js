import { describe, it, expect, vi } from 'vitest';
import { createActor } from 'xstate';
import { createOrgSetupMachine, wizardStepErrors } from './orgSetup.machine.js';

/**
 * Transition coverage for the org setup wizard machine (ADR 0003).
 * Submit is stubbed; every guard and path is walked.
 */
const submitOk = vi.fn().mockResolvedValue({ org: { id: 'org_x', name: 'Himal Digital' } });

const validDraft = {
  name: 'Himal Digital Pvt. Ltd.',
  timezone: 'Asia/Kathmandu',
  sites: ['Baneshwor', 'Lalitpur'],
  calendar: 'bs',
  fiscalYearStart: '07-16',
};

function start(submit = submitOk) {
  const actor = createActor(createOrgSetupMachine(submit));
  actor.start();
  return actor;
}

describe('orgSetup machine — guards', () => {
  it('step1 blocks NEXT without an org name and records the attempt', () => {
    const actor = start();
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step1')).toBe(true);
    expect(actor.getSnapshot().context.attempted).toBe(true);
  });

  it('a successful NEXT clears the attempt flag (errors stop showing)', () => {
    const actor = start();
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().context.attempted).toBe(true);
    actor.send({ type: 'UPDATE', patch: { name: 'Himal Digital' } });
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step2')).toBe(true);
    expect(actor.getSnapshot().context.attempted).toBe(false);
  });

  it('step2 blocks NEXT without a site', () => {
    const actor = start();
    actor.send({ type: 'UPDATE', patch: { name: 'Himal Digital' } });
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step2')).toBe(true);
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step2')).toBe(true);
  });

  it('step3 blocks NEXT with a malformed fiscal year', () => {
    const actor = start();
    actor.send({ type: 'UPDATE', patch: { name: 'Himal Digital', sites: ['Baneshwor'] } });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'UPDATE', patch: { fiscalYearStart: 'July 16' } });
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step3')).toBe(true);
  });
});

describe('orgSetup machine — forward path', () => {
  it('step1 → step2 → step3 → reviewing with valid input', () => {
    const actor = start();
    actor.send({ type: 'UPDATE', patch: validDraft });
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step2')).toBe(true);
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('editing.step3')).toBe(true);
    actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().matches('reviewing')).toBe(true);
  });

  it('BACK moves between steps and back from review to step3', () => {
    const actor = start();
    actor.send({ type: 'UPDATE', patch: validDraft });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'BACK' });
    expect(actor.getSnapshot().matches('editing.step1')).toBe(true);
    actor.send({ type: 'UPDATE', patch: validDraft });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'BACK' });
    expect(actor.getSnapshot().matches('editing.step3')).toBe(true);
  });

  it('SUBMIT → submitting → done with the org stored', async () => {
    const actor = start();
    actor.send({ type: 'UPDATE', patch: validDraft });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT' });
    expect(actor.getSnapshot().matches('submitting')).toBe(true);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('done')).toBe(true));
    expect(actor.getSnapshot().context.org.name).toBe('Himal Digital');
  });

  it('submitting → reviewing on failure with the error stored (retry possible)', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('server error'));
    const actor = start(submit);
    actor.send({ type: 'UPDATE', patch: validDraft });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    expect(actor.getSnapshot().context.lastError).toBeTruthy();
    actor.send({ type: 'SUBMIT' });
    expect(actor.getSnapshot().matches('submitting')).toBe(true);
  });
});

describe('wizardStepErrors (shared guard/validation shape)', () => {
  it('reports per-step keys only', () => {
    const empty = { name: '', sites: [], fiscalYearStart: 'bad' };
    expect(wizardStepErrors(empty, 1)).toEqual({ name: 'wizard.error.nameRequired' });
    expect(wizardStepErrors({ ...empty, name: 'X' }, 2)).toEqual({
      sites: 'wizard.error.siteRequired',
    });
    expect(wizardStepErrors({ ...empty, name: 'X', sites: ['A'] }, 3)).toEqual({
      fiscalYearStart: 'wizard.error.fiscalYearFormat',
    });
    expect(wizardStepErrors(validDraft, 4)).toEqual({});
  });
});
