import { createContext } from 'react';
import type { Outfit } from '../../model/types';

export type OutfitsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; outfits: Outfit[]; unreadable: number };

/**
 * Each write resolves to whether it landed, so the caller can choose the
 * toast. The list is re-read after every write, successful or not, so what is
 * on screen is what storage holds rather than what was hoped for.
 */
export type OutfitsValue = {
  state: OutfitsState;
  // `this: void` on every method: callers destructure this value (see the
  // Probe component in OutfitsProvider.test.tsx), and none of the methods
  // reads `this`, so the annotation is what @typescript-eslint/unbound-method
  // needs to allow that.
  reload(this: void): Promise<void>;
  save(this: void, outfit: Outfit): Promise<boolean>;
  remove(this: void, ids: string[]): Promise<boolean>;
  restore(this: void, outfits: Outfit[]): Promise<boolean>;
};

// Its own file for the reason SessionContext.ts is: react-refresh warns when a
// module exports a component and something else.
export const OutfitsContext = createContext<OutfitsValue | null>(null);
