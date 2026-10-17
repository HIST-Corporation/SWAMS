import { IconButton, cn } from '@swams/ui';

/**
 * Stage-toned icon-only button: the room is dark in both themes, so the
 * light-theme default `bg-surface` button would flash white against it.
 *
 * The control bar is icon-only on purpose — the Meet/Zoom shape. Each control
 * is a 44px circular button whose state reads from its glyph and tone, and
 * whose state-aware action is its `title`/`aria-label` (a hover tooltip), never
 * an inline label. That is what keeps the bar tidy: an inline word like
 * "Unmute microphone" wraps inside a fixed-height pill and overlaps its
 * neighbours on a narrow bar, so the words live on hover instead.
 *
 * Tones:
 *   default — microphone/camera on, share off, rail, fullscreen
 *   off     — speaker muted: a neutral dim, an off state, not an error
 *   danger  — microphone muted or camera off: the "you are muted" red every
 *             call app shares
 *   on      — an active screen share: primary fill
 *   rec     — a live recording: filled red, found instantly
 */
export function StageButton({ tone = 'default', className, ...props }) {
  return (
    <IconButton
      className={cn(
        'border-stage-border bg-stage text-stage-text hover:bg-stage-raised focus-visible:ring-primary',
        tone === 'off' && 'border-stage-border bg-stage-raised text-stage-muted',
        tone === 'danger' && 'border-danger bg-danger text-white hover:bg-danger/90',
        tone === 'on' && 'border-primary bg-primary text-on-primary hover:bg-primary-strong',
        tone === 'rec' && 'border-danger bg-danger text-white hover:bg-danger/90',
        className,
      )}
      {...props}
    />
  );
}