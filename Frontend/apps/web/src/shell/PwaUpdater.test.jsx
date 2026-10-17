// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { ToastProvider } from '@swams/ui';
import { PwaUpdater } from './PwaUpdater.jsx';
import { captureInstallPrompt, noteFirstPunch, resetInstallPrompt } from '../lib/installPrompt.js';

// The virtual module only exists inside a Vite build (aliased to a stub in
// vitest.config.js) — the spec owns its behaviour. The mock mirrors the real
// v2 API: `needRefresh`/`offlineReady` are [state, setState] tuples and the
// plugin drives `options.onNeedRefresh` when a waiting update appears.
const sw = vi.hoisted(() => ({ needRefresh: false, updateServiceWorker: vi.fn() }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options) => {
    if (sw.needRefresh) queueMicrotask(() => options?.onNeedRefresh?.());
    return {
      needRefresh: [sw.needRefresh, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: sw.updateServiceWorker,
    };
  },
}));

let i18n;
beforeAll(() => {
  i18n = initI18n({ lng: 'en' });
});

const fakePromptEvent = () => ({
  preventDefault: vi.fn(),
  prompt: vi.fn().mockResolvedValue(undefined),
  userChoice: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
});

const renderUpdater = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <PwaUpdater />
      </ToastProvider>
    </I18nextProvider>,
  );

describe('PwaUpdater', () => {
  beforeEach(() => {
    resetInstallPrompt();
    window.localStorage.clear();
    sw.needRefresh = false;
    sw.updateServiceWorker = vi.fn();
  });

  it('renders no visible UI of its own — the toasts are its only output', () => {
    renderUpdater();
    expect(screen.queryByText('Install SWAMS')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers the install toast after a confirmed punch and installs on action', async () => {
    const user = userEvent.setup();
    const event = fakePromptEvent();
    renderUpdater();

    act(() => {
      noteFirstPunch();
      captureInstallPrompt(event);
    });

    expect(await screen.findByText('Install SWAMS')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Install' }));
    expect(event.prompt).toHaveBeenCalled();
  });

  it('does not offer the install toast before the first punch', () => {
    renderUpdater();
    act(() => {
      captureInstallPrompt(fakePromptEvent()); // prompt captured, no punch yet
    });
    expect(screen.queryByText('Install SWAMS')).not.toBeInTheDocument();
  });

  it('shows the update toast with a working Reload action', async () => {
    sw.needRefresh = true;
    const user = userEvent.setup();
    renderUpdater();

    expect(await screen.findByText('A new version is ready')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reload now' }));
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
