import type { FieldCapture, FieldGarment } from '../model/field';
import type { Pixels } from '../model/frame';
import type { FieldStore, StorageResult } from './port';

export const FIELD_DB = 'huemi-field';

/* v8 ignore start -- jsdom has no indexedDB; e2e/features/field.feature drives it. */
type FrameRecord = { id: string; width: number; height: number; data: Uint8ClampedArray };

// The request is untyped on purpose: getAll and get return `any`, and T names what the caller stored.
const settle = <T>(request: IDBRequest): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result as T);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('request failed'));
    };
  });

const finished = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error('transaction failed'));
    };
    tx.onabort = () => {
      reject(tx.error ?? new Error('transaction aborted'));
    };
  });

// One open, shared. A failed open stays failed until the page reloads, which
// is the right answer for private mode and for a blocked upgrade.
let opened: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(FIELD_DB, 1);
    request.onupgradeneeded = () => {
      for (const name of ['garments', 'captures', 'frames']) {
        request.result.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('open failed'));
    };
    request.onblocked = () => {
      reject(new Error('open blocked'));
    };
  });
  return opened;
}

// Runs `work` in one transaction and turns every failure, including a failed
// open and a thrown error, into a result.
async function run<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T>,
): Promise<StorageResult<T>> {
  try {
    const db = await openDb();
    const tx = db.transaction(stores, mode);
    // Listen for completion before `work` awaits anything.
    const done = finished(tx);
    // If `work` throws, the transaction aborts and `done` rejects unobserved.
    done.catch(() => undefined);
    const value = await work(tx);
    await done;
    return { ok: true, value };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

const newestFirst =
  <T>(key: (item: T) => string) =>
  (a: T, b: T) =>
    Date.parse(key(b)) - Date.parse(key(a));

export const indexedDbField: FieldStore = {
  listGarments: () =>
    run(['garments'], 'readonly', async (tx) => {
      const all = await settle<FieldGarment[]>(tx.objectStore('garments').getAll());
      return all.sort(newestFirst((g) => g.createdAt));
    }),

  saveGarment: (garment) =>
    run(['garments'], 'readwrite', async (tx) => {
      await settle(tx.objectStore('garments').put(garment));
    }),

  deleteGarment: (id) =>
    run(['garments', 'captures', 'frames'], 'readwrite', async (tx) => {
      const captures = tx.objectStore('captures');
      const frames = tx.objectStore('frames');
      const all = await settle<FieldCapture[]>(captures.getAll());
      const requests: Promise<unknown>[] = [settle(tx.objectStore('garments').delete(id))];
      for (const capture of all) {
        if (capture.garmentId !== id) continue;
        requests.push(settle(captures.delete(capture.id)), settle(frames.delete(capture.id)));
      }
      await Promise.all(requests);
    }),

  listCaptures: () =>
    run(['captures'], 'readonly', async (tx) => {
      const all = await settle<FieldCapture[]>(tx.objectStore('captures').getAll());
      return all.sort(newestFirst((c) => c.takenAt));
    }),

  saveCapture: (capture, pixels) =>
    run(['captures', 'frames'], 'readwrite', async (tx) => {
      const frame: FrameRecord = {
        id: capture.id,
        width: pixels.width,
        height: pixels.height,
        data: pixels.data,
      };
      await Promise.all([
        settle(tx.objectStore('captures').put(capture)),
        settle(tx.objectStore('frames').put(frame)),
      ]);
    }),

  readPixels: (id) =>
    run(['frames'], 'readonly', async (tx): Promise<Pixels> => {
      const frame = await settle<FrameRecord | undefined>(tx.objectStore('frames').get(id));
      if (!frame) throw new Error('no frame');
      return { width: frame.width, height: frame.height, data: frame.data };
    }),

  deleteCapture: (id) =>
    run(['captures', 'frames'], 'readwrite', async (tx) => {
      const captures = tx.objectStore('captures');
      if ((await settle<number>(captures.count(id))) === 0) throw new Error('no capture');
      await Promise.all([settle(captures.delete(id)), settle(tx.objectStore('frames').delete(id))]);
    }),

  linkCapture: (id, garmentId) =>
    run(['captures'], 'readwrite', async (tx) => {
      const captures = tx.objectStore('captures');
      const capture = await settle<FieldCapture | undefined>(captures.get(id));
      if (!capture) throw new Error('no capture');
      await settle(captures.put({ ...capture, garmentId }));
    }),
};
/* v8 ignore stop */
