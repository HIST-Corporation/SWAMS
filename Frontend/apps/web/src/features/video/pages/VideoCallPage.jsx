import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Circle, Clock } from 'lucide-react';
import { PreviewNotice, cn } from '@swams/ui';
import { IN_CALL_CHAT, PARTICIPANTS } from '../mocks/fixtures.js';
import { ROSTER } from '../../../mocks/roster.js';
import { RoomControls } from '../components/RoomControls.jsx';
import { RoomRail } from '../components/RoomRail.jsx';
import { RoomStage } from '../components/RoomStage.jsx';
import { useRoomDevices } from '../hooks/useRoomDevices.js';
import { useRecorder } from '../hooks/useRecorder.js';

/**
 * `/video` — the call room (screen inventory: provider adapter ⚠️, R2 link /
 * R3 native). The room owns the viewport instead of sitting inside a page: one
 * large surface for whoever is talking or sharing, a filmstrip for the rest, a
 * tabbed rail for people/chat/notes, and a control bar pinned to the bottom —
 * the Meet/Zoom shape, so a shared screen is actually readable.
 *
 * What is real here: microphone, camera, screen share and fullscreen are the
 * browser's own devices via `useRoomDevices`. What is not: the participants, the
 * thread, and any notion of a call being *placed* — no signalling, no token, no
 * media leaving the tab, which the footer notice spells out (§7.7 / §12.1).
 */
export function VideoCallPage() {
  const { t } = useTranslation('video');
  const navigate = useNavigate();
  const roomRef = useRef(null);
  const room = useRoomDevices(roomRef);
  const recorder = useRecorder(room.mic);
  const [subjectId, setSubjectId] = useState(PARTICIPANTS[0].id);
  const [railOpen, setRailOpen] = useState(true);
  const [railTab, setRailTab] = useState('chat');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <section
      ref={roomRef}
      aria-label={t('subtitle')}
      className={cn(
        // The room takes the height the shell leaves it — `100dvh` minus the
        // topbar, the main padding and the bottom rail — so the top of the
        // screen is the call, not a page header. Fullscreen hands the same
        // layout the whole display.
        'bg-stage text-stage-text border-stage-border flex h-[calc(100dvh-10.25rem)] min-h-[26rem] flex-col gap-3 overflow-hidden rounded-card border p-3 lg:h-[calc(100dvh-6.75rem)]',
        room.fullscreen && 'h-dvh min-h-0 rounded-none border-0 p-4 lg:h-dvh',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-stage-text font-display truncate text-base font-semibold">
            {t('subtitle')}
          </h1>
        </div>

        <div className="text-stage-muted flex items-center gap-3 text-xs">
          {recorder.recording ? (
            <span className="text-danger inline-flex items-center gap-1.5 font-medium">
              <Circle aria-hidden="true" size={8} fill="currentColor" />
              {t('recording')}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5" title={t('callTime')}>
            <Clock aria-hidden="true" size={12} strokeWidth={1.75} />
            <span className="tabular">{fmt(elapsed)}</span>
          </span>
          <span>{t('participantsCount', { count: PARTICIPANTS.length })}</span>
        </div>
      </header>

      {/* Below `lg` the column scrolls so the control bar can stay put; from
          `lg` up the stage and the rail share the width and nothing scrolls. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:flex-row lg:overflow-visible">
        <RoomStage
          participants={PARTICIPANTS}
          subjectId={subjectId}
          onSelect={setSubjectId}
          sharing={room.sharing}
          screenStream={room.screen}
          cameraStream={room.camera}
        />
        {railOpen ? (
          <RoomRail
            tab={railTab}
            onTab={setRailTab}
            onClose={() => setRailOpen(false)}
            participants={PARTICIPANTS}
            messages={IN_CALL_CHAT}
            roster={ROSTER}
            micOn={room.micOn}
          />
        ) : null}
      </div>

      {room.error ? (
        <p
          role="alert"
          className="border-danger/50 text-stage-text rounded-input border bg-danger/10 px-3 py-2 text-xs"
        >
          {t(`device.${room.error}`)}
        </p>
      ) : null}

      <RoomControls
        devices={room}
        recorder={recorder}
        railOpen={railOpen}
        onToggleRail={() => setRailOpen(true)}
        fullscreen={room.fullscreen}
        fullscreenSupported={room.fullscreenSupported}
        onFullscreen={room.toggleFullscreen}
        onLeave={() => navigate('/meetings')}
      />

      <PreviewNotice
        badgeKey="preview.callBadge"
        bodyKey="preview.callBody"
        className="border-stage-border bg-stage-raised text-stage-muted px-3 py-2 text-xs"
      />
    </section>
  );
}
