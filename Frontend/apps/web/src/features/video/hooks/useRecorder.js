import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Local microphone recording (a real browser capability — MediaRecorder over
 * this tab's own mic stream; nothing is uploaded, §7.7/§12.1).
 *
 * The recorder tracks the mic: turning the mic off stops it, so a "Recording"
 * badge can never outlive the audio it claims to capture. `supported` is
 * feature-detected — a browser without MediaRecorder hides the control rather
 * than offering a toggle that does nothing.
 *
 * @param {object|null} stream the local mic stream from `useRoomDevices`
 */
export function useRecorder(stream) {
  const [recording, setRecording] = useState(false);
  // Feature-detected once, from the prototype: asking at render time means the
  // control is hidden on a browser without MediaRecorder instead of offering
  // a toggle that does nothing.
  const [supported, setSupported] = useState(() => typeof MediaRecorder !== 'undefined');
  const recorderRef = useRef(null);

  // Losing the mic must stop the recording — same honesty rule as the badge.
  useEffect(() => {
    if (!stream && recorderRef.current) {
      recorderRef.current.stop();
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!stream || recorderRef.current) return;
    try {
      const recorder = new MediaRecorder(stream);
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setSupported(false);
    }
  }, [stream]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    if (recorder.state !== 'inactive') recorder.stop();
    setRecording(false);
  }, []);

  return { recording, supported, start, stop };
}
