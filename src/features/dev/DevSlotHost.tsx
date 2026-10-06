import { Suspense, lazy, useMemo } from 'react';
import type { ReactNode } from 'react';
import { DevSlotContext } from '../../ui/DevSlotContext';
import type { DevSlotRenderer } from '../../ui/devSlots';
import { DevErrorBoundary } from './DevErrorBoundary';
import { useDevMode } from './useDevMode';

// Declared at module scope so the chunk is requested at most once. Nothing
// imports the registry until a slot renders with the mode on.
const SlotFillers = lazy(() => import('./registry').then((m) => ({ default: m.SlotFillers })));

// A registry that fails to load leaves the slot empty and the screen standing.
const render: DevSlotRenderer = (name, context) => (
  <DevErrorBoundary fallback={null}>
    <Suspense fallback={null}>
      <SlotFillers name={name} context={context} />
    </Suspense>
  </DevErrorBoundary>
);

/** Gives the screens a slot renderer while developer mode is on, and none while off. */
export function DevSlotHost({ children }: { children: ReactNode }) {
  const { on } = useDevMode();
  const renderer = useMemo(() => (on ? render : null), [on]);
  return <DevSlotContext value={renderer}>{children}</DevSlotContext>;
}
