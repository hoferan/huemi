type Persistable = { persist?: () => Promise<boolean> } | undefined;

/**
 * Asks the browser, once, to keep this site's storage when it would otherwise
 * clear it to free space. Best effort: a browser without the call, one that
 * says no and one that throws all leave the recorder working as before. ADR
 * 0020 says what the answer does not cover.
 */
export function persistOnce(storage: () => Persistable): () => void {
  let asked = false;
  return () => {
    if (asked) return;
    asked = true;
    try {
      void storage()
        ?.persist?.()
        .catch(() => undefined);
    } catch {
      // Nothing to do: the set is stored either way, only less firmly.
    }
  };
}

/**
 * Called before each kit or flow save, so the first save in a page session
 * asks. The call comes before the save's await, inside the tap that started
 * it, in case a browser wants a user gesture before it answers.
 */
export const persistFieldSet = persistOnce(() => navigator.storage);
