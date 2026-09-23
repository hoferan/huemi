import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Outfit } from '../../model/types';
import { localOutfits } from '../../storage/localOutfits';
import type { OutfitList, OutfitStore, StorageResult } from '../../storage/port';
import { OutfitsContext, type OutfitsState } from './OutfitsContext';

function toState(result: StorageResult<OutfitList>): OutfitsState {
  return result.ok ? { status: 'ready', ...result.value } : { status: 'error' };
}

/**
 * The saved list, shared by the bookmark on the suggestions screen, the saved
 * screen and the toast's Undo. It sits above the routes so the bookmark knows
 * what is saved without each screen reading storage for itself.
 *
 * `store` is a prop so tests can hand in a fake; the app uses the default.
 */
export function OutfitsProvider({
  store = localOutfits,
  children,
}: {
  store?: OutfitStore;
  children: ReactNode;
}) {
  const [state, setState] = useState<OutfitsState>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    void store.list().then((result) => {
      if (live) setState(toState(result));
    });
    return () => {
      live = false;
    };
  }, [store]);

  const reload = useCallback(async () => {
    setState(toState(await store.list()));
  }, [store]);

  const run = useCallback(
    async (writes: Array<() => Promise<StorageResult<void>>>) => {
      let landed = true;
      for (const write of writes) {
        if (!(await write()).ok) {
          landed = false;
          break;
        }
      }
      await reload();
      return landed;
    },
    [reload],
  );

  const value = useMemo(
    () => ({
      state,
      reload,
      save: (outfit: Outfit) => run([() => store.save(outfit)]),
      remove: (ids: string[]) => run(ids.map((id) => () => store.remove(id))),
      restore: (outfits: Outfit[]) => run(outfits.map((outfit) => () => store.save(outfit))),
    }),
    [state, reload, run, store],
  );

  return <OutfitsContext value={value}>{children}</OutfitsContext>;
}
