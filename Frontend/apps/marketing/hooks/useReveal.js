/** Scroll-reveal for the marketing site (Section 9.5: one orchestrated moment
 * per section, never a decorative shimmer).
 *
 * Server and client render the same first paint — `shown` starts `true` — so
 * hydration matches exactly (the old "hidden on client, visible on server"
 * first render tripped React's attribute-mismatch error) and the static export
 * ships fully-readable HTML. After hydration, a layout effect hides only the
 * sections sitting fully outside the viewport — before the browser paints
 * them, so nothing flashes — and the observer reveals each one, once, when it
 * scrolls in. `prefers-reduced-motion` — or an environment without
 * IntersectionObserver (jsdom) — leaves everything shown.
 *
 * Returns a ref to attach and a boolean for the caller to toggle classes on —
 * a wrapper component would fight each section's own grid, and a plain
 * className pair means no extra DOM node.
 *
 * @returns {[React.RefObject<HTMLElement>, boolean]}
 */
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Layout effect on the client, plain effect during SSR (effects never run on
// the server either way; the alias just avoids the historical SSR warning).
const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useReveal() {
  const ref = useRef(null);
  // `true` for the first render everywhere (server + hydration); the layout
  // effect below flips it before paint when the section is out of view.
  const [shown, setShown] = useState(true);
  const decided = useRef(false);

  useIsoLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      return undefined; // nothing to hide — stays shown
    }

    if (!decided.current) {
      decided.current = true;
      const rect = node.getBoundingClientRect();
      // Anything visible — even partially — stays revealed, so there is never
      // a visible flip; only off-screen sections hide, pre-paint, unseeable.
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) return undefined;
      setShown(false);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, shown];
}

/** Classes for a revealed block: fade + rise, gated by the reveal hook. */
export const revealClasses = (shown) =>
  shown
    ? 'opacity-100 translate-y-0 transition-opacity duration-sheet ease-standard transition-transform duration-reveal ease-standard'
    : 'opacity-0 translate-y-4 transition-opacity duration-sheet ease-standard transition-transform duration-reveal ease-standard';
