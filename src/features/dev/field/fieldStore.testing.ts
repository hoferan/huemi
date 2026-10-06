import type { FieldCapture, FieldGarment } from '../../../model/field';
import type { Pixels } from '../../../model/frame';
import type { FieldStore, StorageResult } from '../../../storage/port';

const ok = <T>(value: T): Promise<StorageResult<T>> => Promise.resolve({ ok: true, value });
const failed = (reason: string): Promise<StorageResult<never>> =>
  Promise.resolve({ ok: false, reason });

/**
 * An in-memory FieldStore with the port's semantics: upsert by id, newest
 * first, a garment's delete cascading, unknown ids failing. With `failing`,
 * every call fails.
 */
export function fakeFieldStore(options: { failing?: boolean } = {}): FieldStore {
  const garments = new Map<string, FieldGarment>();
  const captures = new Map<string, FieldCapture>();
  const frames = new Map<string, Pixels>();
  const failing = options.failing === true;
  // Runs a call only when the store is not failing.
  const guard =
    <A extends unknown[], T>(run: (...args: A) => Promise<StorageResult<T>>) =>
    (...args: A) =>
      failing ? failed('test') : run(...args);

  return {
    listGarments: guard(() =>
      ok([...garments.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))),
    ),
    saveGarment: guard((garment: FieldGarment) => {
      garments.set(garment.id, garment);
      return ok(undefined);
    }),
    deleteGarment: guard((id: string) => {
      garments.delete(id);
      for (const capture of [...captures.values()]) {
        if (capture.garmentId !== id) continue;
        captures.delete(capture.id);
        frames.delete(capture.id);
      }
      return ok(undefined);
    }),
    listCaptures: guard(() =>
      ok([...captures.values()].sort((a, b) => Date.parse(b.takenAt) - Date.parse(a.takenAt))),
    ),
    saveCapture: guard((capture: FieldCapture, pixels: Pixels) => {
      captures.set(capture.id, capture);
      // A copy, so a later write to the caller's buffer cannot change the store.
      frames.set(capture.id, { ...pixels, data: new Uint8ClampedArray(pixels.data) });
      return ok(undefined);
    }),
    readPixels: guard((id: string) => {
      const frame = frames.get(id);
      return frame ? ok({ ...frame, data: new Uint8ClampedArray(frame.data) }) : failed('no frame');
    }),
    deleteCapture: guard((id: string) => {
      if (!captures.has(id)) return failed('no capture');
      captures.delete(id);
      frames.delete(id);
      return ok(undefined);
    }),
    linkCapture: guard((id: string, garmentId: string) => {
      const capture = captures.get(id);
      if (!capture) return failed('no capture');
      captures.set(id, { ...capture, garmentId });
      return ok(undefined);
    }),
  };
}
