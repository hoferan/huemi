import type { ReactNode } from 'react';
import type { Frame } from '../model/frame';
import type { Hex } from '../model/hex';

/**
 * The places a developer-mode feature may add to the interface, each with the
 * context a screen hands it. The types live in `ui` so a screen can name a
 * slot without importing `features`; what fills a slot is `features/dev`.
 *
 * `confirm.actions` sits under the confirm screen's buttons. `onSettle` adds
 * a listener for the color the user settles on and returns its unsubscribe.
 * A listener hears one settle at most. Leaving for the picker settles
 * nothing. `lowLight` is null for an uploaded photo.
 */
export type DevSlots = {
  'screen.badge': Record<string, never>;
  'confirm.actions': {
    frame: Frame;
    lowLight: boolean | null;
    onSettle: (listener: (hex: Hex) => void) => () => void;
  };
};
export type DevSlotName = keyof DevSlots;
export type DevSlotRenderer = <K extends DevSlotName>(name: K, context: DevSlots[K]) => ReactNode;
