import { useRef, useState } from 'react';
import type { StorageResult } from '../../../storage/port';
import { useSession } from '../../../session/useSession';
import { UNDO_FAILED } from './copy';

/**
 * What the guided runs share about talking to the store. One call is out at a
 * time: a double tap then stores one answer, and nothing moves the run on
 * until the store has answered. Each run builds its own payload and keeps its
 * own reducer; this holds only the guard around them.
 */
export function useRunGuard<A>(dispatch: (action: A) => void) {
  const { dispatch: session } = useSession();
  const busy = useRef(false);
  // True while the summary's export is building its file. The build reads the
  // set piece by piece, so an undo landing then would fail it.
  const [exporting, setExporting] = useState(false);

  /**
   * Runs `call` unless another is out. On success `onDone` runs, which is
   * where the run dispatches, so it never counts what the store does not
   * have. On failure the toast says so and the run stays where it was.
   */
  async function attempt(
    call: () => Promise<StorageResult<unknown>>,
    onDone: () => void,
    failure: string,
  ) {
    if (busy.current) return;
    busy.current = true;
    let result: StorageResult<unknown>;
    try {
      result = await call();
    } finally {
      busy.current = false;
    }
    if (!result.ok) {
      session({ type: 'toastShown', message: failure });
      return;
    }
    onDone();
  }

  return {
    exporting,
    setExporting,
    /** A step's own move, which waits for the store too: a No tapped while a Yes saves would act on a step the Yes is leaving. */
    move: (action: A) => {
      if (!busy.current) dispatch(action);
    },
    /** Saves, and goes on only once the store has it. `call` runs only if the guard is free. */
    save: attempt,
    /** Deletes first and goes back after, so the set never keeps an answer the run took back. */
    undo: (remove: () => Promise<StorageResult<unknown>>, onDone: () => void) =>
      attempt(remove, onDone, UNDO_FAILED),
  };
}
