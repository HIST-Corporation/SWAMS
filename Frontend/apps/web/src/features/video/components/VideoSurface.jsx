import { useEffect, useRef } from 'react';
import { cn } from '@swams/ui';

/**
 * A `<video>` fed by a MediaStream. Kept apart from the room so the stream ↔
 * element wiring exists once: `srcObject` is set in an effect (it is a property,
 * not an attribute, so JSX cannot express it) and cleared on the way out.
 *
 * `muted` matters: a local preview that plays its own audio back is a feedback
 * loop, and the mic track is never rendered here at all.
 *
 * A `MediaStream` carries no caption track, so `media-has-caption` cannot be
 * satisfied here: the `<track>` element it wants only exists for a file with
 * subtitles. Captions arrive with the provider adapter's transcription, which is
 * why the rule is silenced at this one line rather than globally.
 *
 * @param {{ stream: MediaStream, muted?: boolean, className?: string }} props
 */
export function VideoSurface({ stream, muted = true, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    node.srcObject = stream ?? null;
    const play = node.play?.();
    if (play?.catch) play.catch(() => {});
    return () => {
      node.srcObject = null;
    };
  }, [stream]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      aria-hidden="true"
      className={cn('bg-stage-raised h-full w-full object-cover', className)}
    />
  );
}
