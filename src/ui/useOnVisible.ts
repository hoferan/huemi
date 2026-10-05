import { useEffect, useRef, type RefObject } from 'react';

/**
 * Calls `onVisible` once, the first time the element comes on screen.
 *
 * Does nothing where IntersectionObserver is missing, which in practice means
 * jsdom: the callback is a head start, never the only way something happens.
 */
export function useOnVisible(ref: RefObject<Element | null>, onVisible: () => void): void {
  // The latest callback, so the observer set up once still calls the
  // current one.
  const callback = useRef(onVisible);
  useEffect(() => {
    callback.current = onVisible;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      callback.current();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}
