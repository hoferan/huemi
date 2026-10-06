import { describe, expect, it } from 'vitest';
import type { FieldCapture, FieldGarment } from '../../../model/field';
import { parseHex } from '../../../model/hex';
import type { StorageResult } from '../../../storage/port';
import { fakeFieldStore } from './fieldStore.testing';

// The port's contract, held by the fake because every kit test trusts it.
// indexedDbField keeps the same contract; e2e/features/field.feature drives it.

const garment = (id: string, createdAt: string): FieldGarment => ({
  id,
  label: id,
  truth: [parseHex('#1f2a44')],
  createdAt,
});

const capture = (id: string, takenAt: string, garmentId: string | null = null): FieldCapture => ({
  id,
  source: 'kit',
  garmentId,
  settled: null,
  light: 'daylight',
  lowLight: false,
  width: 2,
  height: 1,
  takenAt,
  build: 'test',
});

const pixels = () => ({
  width: 2,
  height: 1,
  data: new Uint8ClampedArray([1, 2, 3, 255, 9, 8, 7, 255]),
});

function value<T>(result: StorageResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
  return result.value;
}

describe('fakeFieldStore', () => {
  it('lists garments newest first', async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('old', '2026-10-01T10:00:00.000Z'));
    await store.saveGarment(garment('new', '2026-10-05T10:00:00.000Z'));
    await store.saveGarment(garment('mid', '2026-10-03T10:00:00.000Z'));
    expect(value(await store.listGarments()).map((g) => g.id)).toEqual(['new', 'mid', 'old']);
  });

  it('lists captures newest first, without pixels', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('a', '2026-10-01T10:00:00.000Z'), pixels());
    await store.saveCapture(capture('b', '2026-10-02T10:00:00.000Z'), pixels());
    const list = value(await store.listCaptures());
    expect(list.map((c) => c.id)).toEqual(['b', 'a']);
    expect(list[0]).not.toHaveProperty('data');
  });

  it("deletes a garment's captures and frames", async () => {
    const store = fakeFieldStore();
    await store.saveGarment(garment('g1', '2026-10-01T10:00:00.000Z'));
    await store.saveGarment(garment('g2', '2026-10-02T10:00:00.000Z'));
    await store.saveCapture(capture('c1', '2026-10-01T10:00:00.000Z', 'g1'), pixels());
    await store.saveCapture(capture('c2', '2026-10-02T10:00:00.000Z', 'g2'), pixels());
    await store.saveCapture(capture('c3', '2026-10-03T10:00:00.000Z'), pixels());

    expect((await store.deleteGarment('g1')).ok).toBe(true);

    expect(value(await store.listGarments()).map((g) => g.id)).toEqual(['g2']);
    expect(value(await store.listCaptures()).map((c) => c.id)).toEqual(['c3', 'c2']);
    expect((await store.readPixels('c1')).ok).toBe(false);
    expect((await store.readPixels('c2')).ok).toBe(true);
  });

  it('links a capture to a garment', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', '2026-10-01T10:00:00.000Z'), pixels());
    expect((await store.linkCapture('c1', 'g1')).ok).toBe(true);
    expect(value(await store.listCaptures())[0]?.garmentId).toBe('g1');
  });

  it('fails to link a capture it does not hold', async () => {
    expect((await fakeFieldStore().linkCapture('nope', 'g1')).ok).toBe(false);
  });

  it('reads back the exact pixels saved', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', '2026-10-01T10:00:00.000Z'), pixels());
    const read = value(await store.readPixels('c1'));
    expect(read.width).toBe(2);
    expect(read.height).toBe(1);
    expect(read.data).toBeInstanceOf(Uint8ClampedArray);
    expect(Array.from(read.data)).toEqual([1, 2, 3, 255, 9, 8, 7, 255]);
  });

  it('deletes a capture with its frame', async () => {
    const store = fakeFieldStore();
    await store.saveCapture(capture('c1', '2026-10-01T10:00:00.000Z'), pixels());
    expect((await store.deleteCapture('c1')).ok).toBe(true);
    expect(value(await store.listCaptures())).toEqual([]);
    expect((await store.readPixels('c1')).ok).toBe(false);
  });

  it('fails to delete a capture it does not hold', async () => {
    expect((await fakeFieldStore().deleteCapture('nope')).ok).toBe(false);
  });

  it('fails every call when failing', async () => {
    const store = fakeFieldStore({ failing: true });
    const results = await Promise.all([
      store.listGarments(),
      store.saveGarment(garment('g', '2026-10-01T10:00:00.000Z')),
      store.deleteGarment('g'),
      store.listCaptures(),
      store.saveCapture(capture('c', '2026-10-01T10:00:00.000Z'), pixels()),
      store.readPixels('c'),
      store.deleteCapture('c'),
      store.linkCapture('c', 'g'),
    ]);
    for (const result of results) expect(result).toEqual({ ok: false, reason: 'test' });
  });
});
