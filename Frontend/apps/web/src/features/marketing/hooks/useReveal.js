import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal (Section 9.5: one orchestrated moment per section, never a
 * decorative shimmer). The observer adds `in` when an element enters the
 * viewport, once; `prefers-reduced-motion` short-circuits so the content is
 * visible immediately rather than animating.
 *
 * Returns a ref to attach and a boolean for the caller to toggle classes on —
 * a wrapper component would fight the page's own grid, and a raw className
 * on a div means no extra DOM node.
 *
 * @returns {[React.RefObject<HTMLElement>, boolean]}
 */
export function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (shown) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
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
  }, [shown]);

  return [ref, shown];
}

/** Classes for a revealed block: fade + rise, gated by the reveal hook. */
export const revealClasses = (shown) =>
  shown
    ? 'opacity-100 translate-y-0 transition-opacity duration-sheet ease-standard transition-transform duration-reveal ease-standard'
    : 'opacity-0 translate-y-4 transition-opacity duration-sheet ease-standard transition-transform duration-reveal ease-standard';
