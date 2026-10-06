import { use } from 'react';
import type { ReactNode } from 'react';
import { DevSlotContext } from './DevSlotContext';
import type { DevSlotName, DevSlots } from './devSlots';

/** Renders whatever developer mode puts in this slot, or nothing. */
export function DevSlot<K extends DevSlotName>({
  name,
  context,
}: {
  name: K;
  context: DevSlots[K];
}): ReactNode {
  const renderer = use(DevSlotContext);
  return renderer ? renderer(name, context) : null;
}
