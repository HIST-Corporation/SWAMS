// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canOfferInstall,
  captureInstallPrompt,
  hasPunched,
  initInstallPrompt,
  isStandalone,
  noteFirstPunch,
  promptInstall,
  resetInstallPrompt,
  subscribeOfferChange,
  suppressFurtherOffers,
} from './installPrompt.js';

/** A minimal stand-in for the browser's BeforeInstallPromptEvent. */
const fakePromptEvent = (outcome = 'accepted') => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  return { preventDefault: vi.fn(), prompt, userChoice: Promise.resolve({ outcome }) };
};

describe('installPrompt', () => {
  beforeEach(() => {
    resetInstallPrompt();
    window.localStorage.clear();
  });

  it('is not standalone in a normal tab', () => {
    expect(isStandalone()).toBe(false);
  });

  it('offers nothing before a prompt is captured and a punch is confirmed', () => {
    expect(canOfferInstall()).toBe(false);
    captureInstallPrompt(fakePromptEvent());
    expect(canOfferInstall()).toBe(false); // no punch yet
    resetInstallPrompt();
    noteFirstPunch();
    expect(canOfferInstall()).toBe(false); // no prompt yet
  });

  it('offers once a prompt is captured AND a punch is confirmed', () => {
    noteFirstPunch();
    captureInstallPrompt(fakePromptEvent());
    expect(hasPunched()).toBe(true);
    expect(canOfferInstall()).toBe(true);
  });

  it('suppresses the offer for a week after it was shown', () => {
    noteFirstPunch();
    captureInstallPrompt(fakePromptEvent());
    suppressFurtherOffers();
    expect(canOfferInstall()).toBe(false);
    // A new prompt arriving later re-arms nothing within the cooldown.
    captureInstallPrompt(fakePromptEvent());
    expect(canOfferInstall()).toBe(false);
  });

  it('re-arms after the cooldown passes', () => {
    vi.useFakeTimers();
    try {
      noteFirstPunch();
      captureInstallPrompt(fakePromptEvent());
      suppressFurtherOffers();
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      captureInstallPrompt(fakePromptEvent());
      expect(canOfferInstall()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the deferred prompt once installed', () => {
    initInstallPrompt();
    noteFirstPunch();
    captureInstallPrompt(fakePromptEvent());
    window.dispatchEvent(new Event('appinstalled'));
    expect(canOfferInstall()).toBe(false);
  });

  it('promptInstall resolves unavailable with no deferred prompt', async () => {
    await expect(promptInstall()).resolves.toBe('unavailable');
  });

  it('promptInstall reports the userChoice outcome and clears the prompt', async () => {
    const event = fakePromptEvent();
    captureInstallPrompt(event);
    await expect(promptInstall()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalled();
    // Second call: the prompt was consumed.
    await expect(promptInstall()).resolves.toBe('unavailable');
  });

  it('promptInstall reports dismissed when the user says no', async () => {
    const event = fakePromptEvent('dismissed');
    captureInstallPrompt(event);
    await expect(promptInstall()).resolves.toBe('dismissed');
  });

  it('promptInstall reports failed when the browser throws', async () => {
    const event = fakePromptEvent();
    event.prompt.mockRejectedValue(new Error('nope'));
    captureInstallPrompt(event);
    await expect(promptInstall()).resolves.toBe('failed');
  });

  it('notifies subscribers when eligibility inputs change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOfferChange(listener);
    noteFirstPunch();
    expect(listener).toHaveBeenCalledTimes(1);
    captureInstallPrompt(fakePromptEvent());
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    suppressFurtherOffers();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('initInstallPrompt wires the browser events exactly once', () => {
    initInstallPrompt();
    initInstallPrompt(); // idempotent under StrictMode double-effects
    noteFirstPunch();
    const event = fakePromptEvent();
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(canOfferInstall()).toBe(true);
  });

  it('survives blocked localStorage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    try {
      noteFirstPunch(); // must not throw
      captureInstallPrompt(fakePromptEvent());
      expect(canOfferInstall()).toBe(false); // punch flag never landed → no offer
    } finally {
      setItem.mockRestore();
      getItem.mockRestore();
    }
  });
});
