import type { DevModeStore } from '../../storage/port';

/** An in-memory store; `value` is what a reload would read back. */
export function fakeDevModeStore(initial = false): DevModeStore & { value: boolean } {
  const store = {
    value: initial,
    isOn: () => store.value,
    setOn: (on: boolean) => {
      store.value = on;
    },
  };
  return store;
}
