import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * No-toast regions: the parts of a screen a toast must not cover.
 *
 * A toast sits at the foot of the screen for up to 5 seconds, and the foot of
 * the screen is where a screen keeps its main actions. Covering them hides
 * the control that has keyboard focus as well as the one a thumb is reaching
 * for. A screen spreads `clearOfToasts` on the element that holds those
 * actions, and the toast floats above it.
 *
 * `e2e/invariants.spec.ts` raises a toast on every route and fails when it
 * covers a control at the foot of the screen, which is how a screen that
 * forgot to mark its actions is found.
 */
export const clearOfToasts = { 'data-toast-clearance': '' } as const;

/** The toast's distance from the bottom of the screen when nothing lifts it. */
export const TOAST_EDGE = 16;
/** The space left between a lifted toast and the region below it. */
export const TOAST_GAP = 8;

type Box = { top: number; bottom: number };

/**
 * How far above the bottom of the screen the toast sits, given its height,
 * the on-screen boxes of the marked regions and the viewport height.
 *
 * Only a region reaching into the band the toast covers at the edge counts,
 * since lifting over one higher up would move the toast for nothing. The
 * lift never takes the toast off the top of the screen.
 */
export function toastLift(height: number, regions: readonly Box[], viewport: number): number {
  const band = viewport - TOAST_EDGE - height;
  let lift = TOAST_EDGE;
  for (const { top, bottom } of regions) {
    if (bottom <= band || top >= viewport) continue;
    lift = Math.max(lift, viewport - top + TOAST_GAP);
  }
  return Math.min(lift, viewport - height - TOAST_EDGE);
}

/**
 * `toastLift` for a toast on screen, kept current while it is up.
 *
 * Regions are found in the document rather than registered, so the toast
 * needs no provider and a screen needs nothing but the attribute. A toast
 * outlives a route change, so the lift is measured again whenever the
 * document's content changes, as well as on scroll and resize. Nothing
 * watches for a region resizing in place: a toast is up for seconds, and
 * every region marked so far changes size only when its content does.
 */
export function useToastLift(toast: RefObject<HTMLElement | null>): number {
  const [lift, setLift] = useState(TOAST_EDGE);

  useLayoutEffect(() => {
    const measure = () => {
      const element = toast.current;
      // The ref is set before a layout effect runs and the listeners go with
      // the cleanup, so this only narrows the type.
      /* v8 ignore next */
      if (!element) return;
      const regions = [...document.querySelectorAll('[data-toast-clearance]')].map((region) =>
        region.getBoundingClientRect(),
      );
      setLift(toastLift(element.offsetHeight, regions, window.innerHeight));
    };
    measure();
    const mutations = new MutationObserver(measure);
    mutations.observe(document.body, { childList: true, characterData: true, subtree: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    return () => {
      mutations.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, { capture: true });
    };
  }, [toast]);

  return lift;
}
