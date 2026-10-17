import { useTranslation } from 'react-i18next';
import { Avatar, Badge, cn } from '@swams/ui';
import { VideoSurface } from './VideoSurface.jsx';

/**
 * The stage: one big surface for whoever (or whatever) is being followed, and a
 * filmstrip of the rest underneath it — the Meet/Zoom shape, so a shared screen
 * gets the whole room instead of a quarter of a grid.
 *
 * Follow order: a shared screen outranks everything (that is the point of
 * sharing); otherwise the selected participant. `cameraStream` is the *local*
 * camera, so it only ever appears on your own tile — the other tiles stay
 * initials until the provider adapter exists, rather than showing a stranger's
 * face that we do not have (Section 9.7).
 *
 * @param {{
 *   participants: Array<{id: string, name: string, you?: boolean, speaking?: boolean}>,
 *   subjectId: string, onSelect: (id: string) => void,
 *   sharing: boolean, screenStream: MediaStream|null, cameraStream: MediaStream|null,
 * }} props
 */
export function RoomStage({
  participants,
  subjectId,
  onSelect,
  sharing,
  screenStream,
  cameraStream,
}) {
  const { t } = useTranslation('video');
  const subject = participants.find((p) => p.id === subjectId) ?? participants[0];
  const subjectIsYou = Boolean(subject?.you);
  const showScreen = sharing && Boolean(screenStream);
  const showSubjectCam = !showScreen && subjectIsYou && Boolean(cameraStream);

  return (
    <div className="flex shrink-0 flex-col gap-3 lg:min-h-0 lg:flex-1">
      <div className="bg-stage-raised border-stage-border relative flex h-56 items-center justify-center overflow-hidden rounded-card border lg:h-auto lg:min-h-0 lg:flex-1">
        {showScreen ? (
          <VideoSurface stream={screenStream} className="object-contain" />
        ) : showSubjectCam ? (
          <VideoSurface stream={cameraStream} className="object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={subject?.name ?? '?'} size="lg" className="h-20 w-20 text-2xl" />
            <span className="text-stage-text text-lg font-semibold">{subject?.name}</span>
            {subjectIsYou && !cameraStream ? (
              <span className="text-stage-muted text-xs">{t('camStart')}</span>
            ) : null}
          </div>
        )}

        <span className="bg-stage/70 text-stage-text absolute top-3 left-3 max-w-[60%] truncate rounded-pill px-2.5 py-1 text-xs font-medium">
          {showScreen ? t('sharingStage') : subject?.name}
        </span>

        {showScreen ? (
          <Badge tone="success" className="absolute top-3 right-3">
            {t('sharingBanner')}
          </Badge>
        ) : null}

        {!showScreen && subject?.speaking ? (
          <Badge tone="info" className="absolute bottom-3 left-3">
            {t('speaking')}
          </Badge>
        ) : null}

        {/* Meet's self-view: your own camera in the corner while the stage is
            following someone else, so you can see what you are sending. */}
        {!showScreen && !subjectIsYou && cameraStream ? (
          <div className="border-stage-border absolute right-3 bottom-3 h-20 w-32 overflow-hidden rounded-input border md:h-24 md:w-40">
            <VideoSurface stream={cameraStream} />
          </div>
        ) : null}
      </div>

      {participants.length > 1 ? (
        <ul aria-label={t('participants')} className="flex shrink-0 gap-2 overflow-x-auto pb-1">
          {participants.map((person) => {
            const selected = person.id === subject?.id;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => onSelect(person.id)}
                  aria-pressed={selected}
                  className={cn(
                    'bg-stage-raised border-stage-border relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-input border transition-colors duration-feedback ease-standard md:h-24 md:w-36',
                    selected ? 'border-primary' : 'hover:border-stage-muted',
                  )}
                >
                  {person.you && cameraStream ? (
                    <VideoSurface stream={cameraStream} />
                  ) : (
                    <Avatar name={person.name} size="md" />
                  )}
                  <span className="bg-stage/70 text-stage-text absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-pill px-1.5 py-0.5 text-[11px]">
                    {person.you ? t('youHost') : person.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
