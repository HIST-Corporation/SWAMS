import { useTranslation } from 'react-i18next';
import {
  Circle,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MonitorX,
  PanelRightOpen,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@swams/ui';
import { StageButton } from './StageControls.jsx';

/**
 * The control bar. Every toggle here drives a real browser device (or the real
 * fullscreen API, or the room's real audio output) — see `useRoomDevices` — so
 * none of it is a decorative switch. Labels are state-aware ("Mute microphone"
 * vs "Unmute microphone") because `aria-pressed` alone leaves a screen-reader
 * user guessing which way it goes.
 *
 * Three zones, Meet-style: devices left, Leave alone in the centre, panel +
 * fullscreen right. The device zone is icon-only — 44px circular buttons whose
 * state reads from their glyph and tone, with the state-aware action as a
 * hover tooltip (title/aria-label), so no inline word can wrap and collide on
 * a narrow bar. Microphone, camera and speaker come first — the three controls
 * a call is judged by — then screen share, then recording past a hairline
 * because recording is a different class of act. A muted microphone or camera
 * fills red — the "you are muted" convention every call app shares — sharing
 * fills primary, and a live recording pulses. Leave stays the only labelled
 * danger control: the one mistake worth making hard, and the one an eye looks
 * for first.
 *
 * @param {{
 *   devices: { micOn: boolean, camOn: boolean, sharing: boolean, speakersOn: boolean,
 *              toggleMic: Function, toggleCamera: Function, toggleShare: Function,
 *              toggleSpeaker: Function },
 *   recorder: { recording: boolean, supported: boolean, start: Function, stop: Function },
 *   railOpen: boolean, onToggleRail: () => void,
 *   fullscreen: boolean, fullscreenSupported: boolean, onFullscreen: () => void,
 *   onLeave: () => void,
 * }} props
 */
export function RoomControls({
  devices,
  recorder,
  railOpen,
  onToggleRail,
  fullscreen,
  fullscreenSupported,
  onFullscreen,
  onLeave,
}) {
  const { t } = useTranslation('video');
  const { micOn, camOn, sharing, speakersOn, toggleMic, toggleCamera, toggleShare, toggleSpeaker } =
    devices;
  const { recording, supported: recordSupported, start: startRec, stop: stopRec } = recorder;

  return (
    <div className="bg-stage-raised border-stage-border grid items-center gap-2.5 rounded-card border p-2.5 sm:grid-cols-[1fr_auto_1fr]">
      {/* Zone 1 — capture and output devices, then sharing, then recording. */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-start">
        <StageButton
          label={micOn ? t('micMute') : t('micUnmute')}
          aria-pressed={micOn}
          onClick={toggleMic}
          tone={micOn ? 'default' : 'danger'}
        >
          {micOn ? (
            <Mic aria-hidden="true" size={18} strokeWidth={1.75} />
          ) : (
            <MicOff aria-hidden="true" size={18} strokeWidth={1.75} />
          )}
        </StageButton>

        <StageButton
          label={camOn ? t('camStop') : t('camStart')}
          aria-pressed={camOn}
          onClick={toggleCamera}
          tone={camOn ? 'default' : 'danger'}
        >
          {camOn ? (
            <Video aria-hidden="true" size={18} strokeWidth={1.75} />
          ) : (
            <VideoOff aria-hidden="true" size={18} strokeWidth={1.75} />
          )}
        </StageButton>

        <StageButton
          label={speakersOn ? t('speakerMute') : t('speakerUnmute')}
          aria-pressed={speakersOn}
          onClick={toggleSpeaker}
          tone={speakersOn ? 'default' : 'off'}
        >
          {speakersOn ? (
            <Volume2 aria-hidden="true" size={18} strokeWidth={1.75} />
          ) : (
            <VolumeX aria-hidden="true" size={18} strokeWidth={1.75} />
          )}
        </StageButton>

        <StageButton
          label={sharing ? t('shareStop') : t('shareStart')}
          aria-pressed={sharing}
          onClick={toggleShare}
          tone={sharing ? 'on' : 'default'}
        >
          {sharing ? (
            <MonitorX aria-hidden="true" size={18} strokeWidth={1.75} />
          ) : (
            <MonitorUp aria-hidden="true" size={18} strokeWidth={1.75} />
          )}
        </StageButton>

        {/* Recording is a different class of act — past a hairline, and louder
            when live: a pulsing dot and the word, not just a filled icon. */}
        <span aria-hidden="true" className="bg-stage-border mx-1 hidden h-6 w-px sm:block" />

        {recordSupported ? (
          <StageButton
            label={recording ? t('recordStop') : t('recordStart')}
            aria-pressed={recording}
            onClick={recording ? stopRec : startRec}
            tone={recording ? 'rec' : 'default'}
            className={recording ? undefined : 'text-danger'}
            disabled={!recording && !micOn}
            title={!recording && !micOn ? t('recordingLocalNote') : undefined}
          >
            {recording ? (
              <span
                aria-hidden="true"
                className="bg-current animate-pulse motion-reduce:animate-none h-2.5 w-2.5 rounded-pill"
              />
            ) : (
              <Circle aria-hidden="true" size={18} strokeWidth={1.75} />
            )}
          </StageButton>
        ) : null}
      </div>

      {/* Zone 2 — Leave, centred. The one control that ends the room. */}
      <div className="flex justify-center">
        <Button
          variant="danger"
          onClick={onLeave}
          title={t('endCallLabel')}
          className="rounded-pill h-11 px-5"
        >
          <PhoneOff aria-hidden="true" size={16} strokeWidth={1.75} />
          {t('endCall')}
        </Button>
      </div>

      {/* Zone 3 — room utilities. */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {railOpen ? null : (
          <StageButton label={t('railShow')} onClick={onToggleRail}>
            <PanelRightOpen aria-hidden="true" size={18} strokeWidth={1.75} />
          </StageButton>
        )}

        {fullscreenSupported ? (
          <StageButton
            label={fullscreen ? t('exitFullscreen') : t('toggleFullscreen')}
            aria-pressed={fullscreen}
            onClick={onFullscreen}
          >
            {fullscreen ? (
              <Minimize2 aria-hidden="true" size={18} strokeWidth={1.75} />
            ) : (
              <Maximize2 aria-hidden="true" size={18} strokeWidth={1.75} />
            )}
          </StageButton>
        ) : null}
      </div>
    </div>
  );
}
