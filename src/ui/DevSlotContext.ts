import { createContext } from 'react';
import type { DevSlotRenderer } from './devSlots';

/** Null until developer mode is on, so a slot renders nothing before then. */
export const DevSlotContext = createContext<DevSlotRenderer | null>(null);
