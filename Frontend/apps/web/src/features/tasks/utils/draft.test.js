import { describe, expect, it } from 'vitest';
import { toDraft, toPatch } from './draft.js';

const TASK = {
  id: 'tsk_01',
  title: 'Prepare the payroll export',
  description: 'Finance needs it.',
  lane: 'todo',
  priority: 'high',
  assignee: { id: 'u_anita', name: 'Anita Thapa' },
  reviewer: null,
  due: '2026-10-14',
  note: null,
};

describe('task draft ⇄ patch', () => {
  it('reads a task into a draft without inventing values', () => {
    expect(toDraft(TASK)).toEqual({
      title: 'Prepare the payroll export',
      description: 'Finance needs it.',
      priority: 'high',
      lane: 'todo',
      due: '2026-10-14',
      assigneeId: 'u_anita',
      reviewerId: '',
      note: '',
    });
  });

  it('sends only the fields that changed', () => {
    const draft = { ...toDraft(TASK), priority: 'low' };
    expect(toPatch(draft, TASK)).toEqual({ priority: 'low' });
  });

  it('sends nothing at all when the panel is untouched', () => {
    expect(toPatch(toDraft(TASK), TASK)).toEqual({});
  });

  it('clears a date or a person with null, never an empty string', () => {
    const draft = { ...toDraft(TASK), due: '', assigneeId: '', reviewerId: 'u_ramesh' };
    expect(toPatch(draft, TASK)).toEqual({ due: null, assigneeId: null, reviewerId: 'u_ramesh' });
  });

  it('trims text fields before they reach the API', () => {
    const draft = { ...toDraft(TASK), title: '  Payroll export  ', note: '  signed off  ' };
    expect(toPatch(draft, TASK)).toEqual({ title: 'Payroll export', note: 'signed off' });
  });
});
