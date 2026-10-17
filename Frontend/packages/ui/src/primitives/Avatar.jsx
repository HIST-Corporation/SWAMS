import { useState } from 'react';
import { cn } from '../utils/cn.js';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-12 w-12 text-base',
};

/**
 * Literal class names so Tailwind's content scan generates them (Section 8.2
 * chips). These hue pairs are the fallback treatment when a person has no
 * portrait image: one accent→violet-style gradient with white initials. The
 * hue still encodes the nav category (Section 9.7: the name is always adjacent
 * — never colour alone).
 */
const HUES = {
  indigo: 'bg-[linear-gradient(135deg,var(--primary),var(--violet))]',
  marigold: 'bg-[linear-gradient(135deg,var(--accent),var(--danger))]',
  teal: 'bg-[linear-gradient(135deg,var(--info),var(--success))]',
  rose: 'bg-[linear-gradient(135deg,var(--rose),var(--violet))]',
  violet: 'bg-[linear-gradient(135deg,var(--violet),var(--primary))]',
};

/** The prototype's `.av-status` dot: 9px, ringed in the rail colour. */
const STATUS = {
  online: 'bg-success',
  busy: 'bg-warning',
  away: 'bg-text-faint',
  do_not_disturb: 'bg-violet',
  offline: 'bg-text-faint',
};

/**
 * Avatar — a person on screen. With `src` it renders the portrait image
 * (the demo roster ships illustrated portraits in `public/avatars/`, generated
 * by `scripts/gen-avatars.mjs`); without one — or if the image fails to load —
 * it falls back to initials on a token gradient, so a missing file degrades to
 * the old treatment instead of a broken image. `hue` matches the icon-chip
 * tints in 8.2. `status` is optional and is always accompanied by a title, so
 * the dot never carries meaning on its own (Section 8.9).
 *
 * `statusRing` is the ring colour that separates the dot from the surface the
 * avatar sits on — the prototype rings the dot in the rail colour
 * (`border:2px solid var(--bg2)`), so an avatar on the sidebar rail passes
 * `ring-nav-bg` while one on the page keeps the default `ring-bg`. Literal
 * class strings only (see HUES) so Tailwind's content scan emits them.
 *
 * @param {{ name: string, src?: string|null, hue?: keyof typeof HUES, size?: keyof typeof SIZES, status?: keyof typeof STATUS, statusRing?: 'ring-bg'|'ring-nav-bg' }} props
 */
export function Avatar({ name, src = null, hue = 'indigo', size = 'md', status, statusRing = 'ring-bg', className, ...props }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  const initials = String(name ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'relative inline-flex shrink-0',
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    >
      {/* The clipping lives on the inner circle, NOT the outer box: the status
          dot is a sibling that must sit on the circle's edge, in front — an
          outer overflow-hidden clipped it into the gradient (the prototype's
          `.avatar` has no clipping; its `.av-status` dot sits on the rim). */}
      <span
        className={cn(
          'flex h-full w-full items-center justify-center overflow-hidden rounded-pill font-semibold text-white',
          HUES[hue] ?? HUES.indigo,
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          initials
        )}
      </span>
      {status ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-0 bottom-0 z-10 block h-2.5 w-2.5 rounded-pill ring-2',
            statusRing,
            STATUS[status] ?? STATUS.away,
          )}
        />
      ) : null}
    </span>
  );
}

export { SIZES as AVATAR_SIZES, HUES as AVATAR_HUES };
