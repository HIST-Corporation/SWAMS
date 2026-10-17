// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { initI18n } from '@swams/i18n';
import { VideoCallPage } from './VideoCallPage.jsx';

let i18n;
beforeAll(() => {
  i18n = initI18n({ lng: 'en' });
});

beforeEach(() => {
  // jsdom has no media pipeline: `play()` is a not-implemented stub there, and
  // each test decides which devices the "browser" has.
  HTMLMediaElement.prototype.play = vi.fn();
});

const stream = () => ({
  getTracks: () => [{ stop: vi.fn() }],
  getVideoTracks: () => [{ addEventListener: vi.fn() }],
});

const withDevices = ({ getUserMedia, getDisplayMedia } = {}) => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, getDisplayMedia },
  });
};

const renderRoom = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/video']}>
        <Routes>
          <Route path="/video" element={<VideoCallPage />} />
          <Route path="/meetings" element={<p>meetings screen</p>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );

describe('VideoCallPage', () => {
  it('opens without touching a device and names the sample scope', () => {
    const getUserMedia = vi.fn();
    withDevices({ getUserMedia });
    renderRoom();

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /Weekly Standup/ })).toBeTruthy();
    expect(screen.getByText('Sample call')).toBeTruthy();
    expect(screen.getByText('4 in room')).toBeTruthy();
    // The filmstrip offers every participant, and the host is called out.
    expect(screen.getAllByRole('button', { name: /You · Host/ }).length).toBe(1);
  });

  it('turns the camera into a real stream and releases it again', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(stream());
    withDevices({ getUserMedia });
    renderRoom();

    fireEvent.click(screen.getByRole('button', { name: 'Turn camera on' }));

    const off = await screen.findByRole('button', { name: 'Turn camera off' });
    expect(getUserMedia).toHaveBeenCalledWith({ video: true });
    expect(off.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(off);
    expect(screen.getByRole('button', { name: 'Turn camera on' })).toBeTruthy();
  });

  it('puts a shared screen on the stage and clears it when sharing stops', async () => {
    const getDisplayMedia = vi.fn().mockResolvedValue(stream());
    withDevices({ getDisplayMedia });
    renderRoom();

    fireEvent.click(screen.getByRole('button', { name: 'Share screen' }));

    const stop = await screen.findByRole('button', { name: 'Stop sharing' });
    expect(getDisplayMedia).toHaveBeenCalledWith({ video: true });
    expect(screen.getByText("You're sharing your screen")).toBeTruthy();
    expect(screen.getByText('Your screen')).toBeTruthy();

    fireEvent.click(stop);
    expect(screen.getByRole('button', { name: 'Share screen' })).toBeTruthy();
  });

  it('reports a blocked device instead of showing a toggle that appears to work', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    withDevices({ getUserMedia });
    renderRoom();

    fireEvent.click(screen.getByRole('button', { name: 'Turn camera on' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/blocked access/);
    expect(screen.getByRole('button', { name: 'Turn camera on' })).toBeTruthy();
  });

  it('switches the rail between chat and notes without a page change', () => {
    withDevices({});
    renderRoom();

    expect(
      screen.getByText('Sample messages — sending turns on when the meeting channel exists.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Notes' }));
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeTruthy();
    expect(
      screen.getByText('Notes stay in this browser until the notes endpoint is saved.'),
    ).toBeTruthy();
  });

  it('leaves the room back to the meetings screen', () => {
    withDevices({});
    renderRoom();

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.getByText('meetings screen')).toBeTruthy();
  });
});
