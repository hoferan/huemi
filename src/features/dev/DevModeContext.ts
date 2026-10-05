import { createContext } from 'react';
import type { UnlockMethod } from './passphrase';

export type DevModeValue = {
  on: boolean;
  method: UnlockMethod;
  // `this: void` on every method for the reason OutfitsContext.ts gives.
  /** Direct builds only; does nothing otherwise. */
  unlock(this: void): void;
  tryPassphrase(this: void, passphrase: string): Promise<boolean>;
  lock(this: void): void;
};

// The default is what every screen sees when rendered without a provider,
// which is every existing unit test: off, with nothing to unlock.
// Its own file for the reason SessionContext.ts is: react-refresh warns when a
// module exports a component and something else.
export const DevModeContext = createContext<DevModeValue>({
  on: false,
  method: 'none',
  unlock: () => undefined,
  lock: () => undefined,
  tryPassphrase: () => Promise.resolve(false),
});
