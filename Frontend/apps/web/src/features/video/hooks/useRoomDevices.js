import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The browser half of the call room: local microphone, camera, screen share and
 * fullscreen — all REAL browser capabilities, none of them a call. Nothing goes
 * anywhere (no signalling, no token), which is why every surface that uses this
 * hook also says so out loud.
 *
 * Two rules this hook keeps:
 *  - **No permission before it is asked for.** Nothing is acquired on mount; the
 *    mic/camera/screen buttons are the only things that call `getUserMedia` /
 *    `getDisplayMedia`, so opening the page never lights up a device.
 *  - **Failures are states, not silence.** A blocked or missing device comes back
 *    as an error code the page turns into copy, instead of a toggle that appears
 *    to work.
 *
 * The room element is passed in rather than returned: keeping the ref out of the
 * hook's result leaves that result plain state, which the lint rules (and the
 * compiler) can reason about normally.
 *
 * @param {{ current: HTMLElement|null }} roomRef the element that goes fullscreen
 * @returns {{
 *   camera: object|null, mic: object|null, screen: object|null,
 *   micOn: boolean, camOn: boolean, sharing: boolean,
 *   error: null|'denied'|'unavailable', clearError: () => void,
 *   toggleMic: () => Promise<void>, toggleCamera: () => Promise<void>,
 *   toggleShare: () => Promise<void>, stopShare: () => void,
 *   fullscreen: boolean, fullscreenSupported: boolean, toggleFullscreen: () => Promise<void>,
 *   speakersOn: boolean, toggleSpeaker: () => void,
 * }}
 */
export function useRoomDevices(roomRef) {
  const micRef = useRef(null);
  const camRef = useRef(null);
  const shareRef = useRef(null);

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camera, setCamera] = useState(null);
  const [mic, setMic] = useState(null);
  const [screen, setScreen] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [speakersOn, setSpeakersOn] = useState(true);

  const stopStream = (stream) => stream?.getTracks().forEach((track) => track.stop());

  // Read the device API at call time, not render time: a browser that gains
  // `mediaDevices` after mount is still picked up, and a security-scoped context
  // never leaves a stale reference behind.
  const devices = () => (typeof navigator !== 'undefined' ? navigator.mediaDevices : null);

  // Feature-detect once, from the prototype: asking the ref would be false on
  // the first render and leave the button missing until something else changed.
  const fullscreenSupported =
    typeof document !== 'undefined' &&
    typeof document.documentElement?.requestFullscreen === 'function';

  /** Release every device on unmount — a closed tab must not keep a camera warm. */
  useEffect(() => {
    return () => {
      stopStream(micRef.current);
      stopStream(camRef.current);
      stopStream(shareRef.current);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const toggleMic = useCallback(async () => {
    if (micRef.current) {
      stopStream(micRef.current);
      micRef.current = null;
      setMic(null);
      setMicOn(false);
      return;
    }
    const api = devices();
    if (!api?.getUserMedia) {
      setError('unavailable');
      return;
    }
    try {
      micRef.current = await api.getUserMedia({ audio: true });
      setMic(micRef.current);
      setMicOn(true);
      setError(null);
    } catch {
      setError('denied');
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (camRef.current) {
      stopStream(camRef.current);
      camRef.current = null;
      setCamera(null);
      setCamOn(false);
      return;
    }
    const api = devices();
    if (!api?.getUserMedia) {
      setError('unavailable');
      return;
    }
    try {
      camRef.current = await api.getUserMedia({ video: true });
      setCamera(camRef.current);
      setCamOn(true);
      setError(null);
    } catch {
      setError('denied');
    }
  }, []);

  const stopShare = useCallback(() => {
    stopStream(shareRef.current);
    shareRef.current = null;
    setScreen(null);
    setSharing(false);
  }, []);

  /**
   * Screen share, Meet/Zoom style: the button asks the browser for a screen, and
   * stopping from the browser's own bar (`track.onended`) clears the stage too —
   * otherwise the stage would keep showing a frozen last frame.
   */
  const toggleShare = useCallback(async () => {
    if (shareRef.current) {
      stopShare();
      return;
    }
    const api = devices();
    if (!api?.getDisplayMedia) {
      setError('unavailable');
      return;
    }
    try {
      const stream = await api.getDisplayMedia({ video: true });
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopStream(shareRef.current);
        shareRef.current = null;
        setScreen(null);
        setSharing(false);
      });
      shareRef.current = stream;
      setScreen(stream);
      setSharing(true);
      setError(null);
    } catch {
      setError('denied');
    }
  }, [stopShare]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await roomRef?.current?.requestFullscreen?.();
    } catch {
      setError('unavailable');
    }
  }, [roomRef]);

  /**
   * Speakers are the room's real output path: one switch mutes every media
   * element the room holds, so today's local previews and tomorrow's remote
   * audio answer to the same control. The effect re-applies after a stream
   * swap because a fresh `<video>` arrives unmuted by default.
   */
  useEffect(() => {
    roomRef?.current?.querySelectorAll('audio, video')?.forEach((node) => {
      node.muted = !speakersOn;
    });
  }, [speakersOn, camera, screen, roomRef]);

  const toggleSpeaker = useCallback(() => setSpeakersOn((on) => !on), []);

  return {
    camera,
    mic,
    screen,
    micOn,
    camOn,
    sharing,
    error,
    clearError,
    toggleMic,
    toggleCamera,
    toggleShare,
    stopShare,
    fullscreen,
    fullscreenSupported,
    toggleFullscreen,
    speakersOn,
    toggleSpeaker,
  };
}
