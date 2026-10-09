import type { ComponentType } from 'react';
import type { DevSlotName, DevSlots } from '../../ui/devSlots';
import { DevBadge } from './DevBadge';
import { CheckEnginePanel } from './engine/CheckEnginePanel';
import { SuggestEnginePanel } from './engine/SuggestEnginePanel';
import { RecordControl } from './field/RecordControl';
import { ReaderPanel } from './reader/ReaderPanel';

/**
 * Everything developer mode adds, by slot. This module is the lazy chunk's
 * entry (`DevSlotHost`), so a build with the mode off never loads any of it.
 */
const FILLERS: { [K in DevSlotName]: readonly ComponentType<DevSlots[K]>[] } = {
  'screen.badge': [DevBadge],
  'confirm.actions': [RecordControl],
  'confirm.overlay': [ReaderPanel],
  'suggest.overlay': [SuggestEnginePanel],
  'check.overlay': [CheckEnginePanel],
};

export function SlotFillers<K extends DevSlotName>({
  name,
  context,
}: {
  name: K;
  context: DevSlots[K];
}) {
  const fillers: readonly ComponentType<DevSlots[K]>[] = FILLERS[name];
  return fillers.map((Filler, i) => <Filler key={i} {...context} />);
}
