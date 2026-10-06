import type { FieldCapture, FieldGarment } from '../model/field';
import type { Pixels } from '../model/frame';
import type { FieldStore, StorageResult } from './port';

export const FIELD_DB = 'huemi-field';

/* v8 ignore start -- jsdom has no indexedDB; e2e/features/field.feature drives it. */
type FrameRecord = { id: string; width: number; height: number; data: Uint8ClampedArray };
type MetaRecord = { id: 'setId'; value: string };

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

// One open, shared, and forgotten whenever it stops being usable, so the
// next call opens again: after a failed open, after another tab's upgrade
// asks this one to close, and after the browser closes it.
let opened: Promise<IDBDatabase> | undefined;

const STORES = ['garments', 'captures', 'frames', 'meta'];

function openDb(): Promise<IDBDatabase> {
  if (opened) return opened;
  const attempt = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(FIELD_DB, 1);
    request.onupgradeneeded = (event) => {
      // Each version's stores, so a later version adds its own and leaves these.
      if (event.oldVersion < 1) {
        for (const name of STORES) request.result.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opened = undefined;
      };
      db.onclose = () => {
        opened = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('open failed'));
    };
    // No onblocked: a blocked open waits for the other tab to close its
    // connection and then succeeds, so it is not a failure.
  });
  opened = attempt;
  attempt.catch(() => {
    if (opened === attempt) opened = undefined;
  });
  return attempt;
}

// iOS can drop the connection while the app is in the background without
// firing onclose, and the next transaction then throws InvalidStateError.
// One fresh open is worth a try before that counts as a failure.
async function transaction(stores: string[], mode: IDBTransactionMode): Promise<IDBTransaction> {
  const db = await openDb();
  try {
    return db.transaction(stores, mode);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'InvalidStateError')) throw error;
    opened = undefined;
    return (await openDb()).transaction(stores, mode);
  }
}

// Runs `work` in one transaction and turns every failure, including a failed
// open and a thrown error, into a result.
async function run<T>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T>,
): Promise<StorageResult<T>> {
  try {
    const tx = await transaction(stores, mode);
    // Listen for completion before `work` awaits anything.
    const done = finished(tx);
    // If `work` throws, the transaction is aborted below and `done` rejects
    // unobserved.
    done.catch(() => undefined);
    let value: T;
    try {
      value = await work(tx);
    } catch (error) {
      try {
        tx.abort();
      } catch {
        // Already finished, so there is nothing to undo.
      }
      throw error;
    }
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

  setId: () =>
    run(['meta'], 'readwrite', async (tx) => {
      const meta = tx.objectStore('meta');
      const kept = await settle<MetaRecord | undefined>(meta.get('setId'));
      if (kept) return kept.value;
      const made: MetaRecord = { id: 'setId', value: crypto.randomUUID() };
      await settle(meta.put(made));
      return made.value;
    }),
};
/* v8 ignore stop */
