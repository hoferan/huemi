import type { ReactNode } from 'react';

/**
 * The places a developer-mode feature may add to the interface, each with the
 * context a screen hands it. The types live in `ui` so a screen can name a
 * slot without importing `features`; what fills a slot is `features/dev`.
 */
export type DevSlots = { 'screen.badge': Record<string, never> };
export type DevSlotName = keyof DevSlots;
export type DevSlotRenderer = <K extends DevSlotName>(name: K, context: DevSlots[K]) => ReactNode;
