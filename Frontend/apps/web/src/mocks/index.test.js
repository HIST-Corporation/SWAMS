// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { rearmMockWorkerOnVisible, shouldUseMock } from './index.js';

describe('shouldUseMock', () => {
  const env = {};

  it('turns mocks on when no API URL is configured', () => {
    expect(shouldUseMock('', env)).toBe(true);
  });

  it('turns mocks off when VITE_API_URL is set', () => {
    expect(shouldUseMock('', { VITE_API_URL: 'https://api.example.com' })).toBe(false);
  });

  it('honours ?mock=1 / ?mock=0 over the environment', () => {
    expect(shouldUseMock('?mock=1', { VITE_API_URL: 'https://api.example.com' })).toBe(true);
    expect(shouldUseMock('?mock=0', env)).toBe(false);
    expect(shouldUseMock('', { VITE_MOCK: '0' })).toBe(false);
    expect(shouldUseMock('', { VITE_MOCK: '1' })).toBe(true);
  });
});

describe('rearmMockWorkerOnVisible', () => {
  /** A stand-in for `document` with a switchable visibilityState. */
  function fakeTarget(visibilityState) {
    const listeners = new Set();
    return {
      visibilityState,
      addEventListener: (type, fn) => type === 'visibilitychange' && listeners.add(fn),
      removeEventListener: (type, fn) => listeners.delete(fn),
      emit: () => listeners.forEach((fn) => fn()),
      get listenerCount() {
        return listeners.size;
      },
    };
  }

  it('re-activates the worker when the tab becomes visible again', () => {
    const postMessage = vi.fn();
    const target = fakeTarget('hidden');
    rearmMockWorkerOnVisible({ target, worker: { controller: { postMessage } } });

    target.emit();
    expect(postMessage).not.toHaveBeenCalled();

    target.visibilityState = 'visible';
    target.emit();
    expect(postMessage).toHaveBeenCalledWith('MOCK_ACTIVATE');
  });

  it('posts nothing while no worker controls the page', () => {
    const target = fakeTarget('visible');
    const worker = { controller: null };
    const cleanup = rearmMockWorkerOnVisible({ target, worker });
    target.emit();
    expect(worker.controller).toBeNull();
    expect(cleanup).toEqual(expect.any(Function));
  });

  it('arms a worker that attaches after the listener is registered', () => {
    const target = fakeTarget('visible');
    const postMessage = vi.fn();
    const worker = { controller: null };
    rearmMockWorkerOnVisible({ target, worker });

    worker.controller = { postMessage };
    target.emit();
    expect(postMessage).toHaveBeenCalledWith('MOCK_ACTIVATE');
  });

  it('does nothing outside the browser (no service worker API)', () => {
    const target = fakeTarget('visible');
    expect(rearmMockWorkerOnVisible({ target, worker: undefined })).toEqual(expect.any(Function));
    expect(target.listenerCount).toBe(0);
  });

  it('can be torn down', () => {
    const target = fakeTarget('visible');
    const cleanup = rearmMockWorkerOnVisible({ target, worker: { controller: {} } });
    cleanup();
    expect(target.listenerCount).toBe(0);
  });
});
