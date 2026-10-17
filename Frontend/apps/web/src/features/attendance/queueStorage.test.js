// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearQueue, loadQueue, saveQueue } from './queueStorage.js';

const QUEUED = {
  id: 'k1',
  idempotencyKey: 'k1',
  kind: 'in',
  clientTs: '2026-10-09T03:17:00Z',
  location: null,
  attempts: 0,
  status: 'queued',
};

beforeEach(() => {
  clearQueue();
});

describe('queueStorage', () => {
  it('loads nothing on a fresh device', () => {
    expect(loadQueue()).toEqual([]);
  });

  it('round-trips the unsent queue and drops sent items', () => {
    saveQueue([{ ...QUEUED }, { ...QUEUED, id: 'k2', idempotencyKey: 'k2', status: 'sent' }]);
    const restored = loadQueue();
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ id: 'k1', status: 'queued', attempts: 0 });
  });

  it('restores an interrupted flight as queued — the idempotency key makes the retry safe', () => {
    saveQueue([{ ...QUEUED, status: 'sending', attempts: 1 }]);
    const restored = loadQueue();
    expect(restored[0]).toMatchObject({ id: 'k1', status: 'queued', attempts: 1 });
  });

  it('keeps items that need attention, reason included', () => {
    saveQueue([{ ...QUEUED, status: 'needs_attention', reason: 'already_clocked_in' }]);
    expect(loadQueue()[0]).toMatchObject({
      status: 'needs_attention',
      reason: 'already_clocked_in',
    });
  });

  it('treats corrupt or shapeless storage as an empty queue', () => {
    localStorage.setItem('swams.queue.attendance.v1', 'not-json{');
    expect(loadQueue()).toEqual([]);
    localStorage.setItem('swams.queue.attendance.v1', JSON.stringify({ nope: true }));
    expect(loadQueue()).toEqual([]);
    localStorage.setItem('swams.queue.attendance.v1', JSON.stringify([{ id: 'no-keys-here' }]));
    expect(loadQueue()).toEqual([]);
  });

  it('survives a dead storage backend instead of breaking the session', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveQueue([QUEUED])).not.toThrow();
    expect(loadQueue()).toEqual([]);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
