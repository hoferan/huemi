import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { localDevMode } from '../../storage/localDevMode';
import type { DevModeStore } from '../../storage/port';
import { DevModeContext } from './DevModeContext';
import { hashPassphrase, unlockMethod } from './passphrase';

const BUILD_ENV = { dev: import.meta.env.DEV, hash: import.meta.env.VITE_DEV_MODE_HASH };

/**
 * Whether the hidden developer mode is on. The state starts from the store,
 * which is synchronous, so a deep link to /dev is judged on the first render.
 *
 * `store` and `env` are props so tests can hand in a fake and pick a build
 * kind; the app uses the defaults.
 */
export function DevModeProvider({
  store = localDevMode,
  env = BUILD_ENV,
  children,
}: {
  store?: DevModeStore;
  env?: { dev: boolean; hash: string | undefined };
  children: ReactNode;
}) {
  const [on, setOn] = useState(() => store.isOn());
  // `hashPassphrase` gives lowercase hex, and a value pasted into a deploy
  // setting may come with capitals or stray whitespace.
  const hash = env.hash?.trim().toLowerCase();
  const method = unlockMethod({ dev: env.dev, hash });

  const set = useCallback(
    (next: boolean) => {
      try {
        store.setOn(next);
      } catch {
        // A store that cannot write must not block the change in memory.
      }
      setOn(next);
    },
    [store],
  );

  const value = useMemo(
    () => ({
      on,
      method,
      unlock: () => {
        if (method === 'direct') set(true);
      },
      tryPassphrase: async (passphrase: string) => {
        if (method !== 'passphrase' || !hash) return false;
        if ((await hashPassphrase(passphrase)) !== hash) return false;
        set(true);
        return true;
      },
      lock: () => {
        set(false);
      },
    }),
    [on, method, hash, set],
  );

  return <DevModeContext value={value}>{children}</DevModeContext>;
}
