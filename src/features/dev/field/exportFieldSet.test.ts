import { describe, expect, it } from 'vitest';
import type { FieldCapture, FieldGarment } from '../../../model/field';
import { decodeFieldExport } from '../../../model/fieldExport';
import { parseHex } from '../../../model/hex';
import { fakeSharePort } from '../../share/fakeShare.testing';
import { exportFieldSet, exportFileName } from './exportFieldSet';
import { fakeFieldStore } from './fieldStore.testing';

const NOW = new Date(2026, 9, 6, 23, 30);

const GARMENT: FieldGarment = {
  id: 'g1',
  label: 'Navy coat',
  truth: [parseHex('#1f2a44')],
  createdAt: '2026-10-01T10:00:00.000Z',
};

const CAPTURE: FieldCapture = {
  id: 'c1',
  source: 'kit',
  garmentId: 'g1',
  settled: null,
  light: 'lamp',
  lowLight: false,
  width: 2,
  height: 1,
  takenAt: '2026-10-05T10:00:00.000Z',
  build: 'test',
};

const PIXELS = {
  width: 2,
  height: 1,
  data: new Uint8ClampedArray([31, 42, 68, 255, 0, 128, 255, 254]),
};

const identity = (bytes: Uint8Array<ArrayBuffer>) => Promise.resolve(bytes);

async function seeded() {
  const store = fakeFieldStore();
  await store.saveGarment(GARMENT);
  await store.saveCapture(CAPTURE, PIXELS);
  return store;
}

describe('exportFileName', () => {
  it('names the file by the local date', () => {
    expect(exportFileName(new Date(2026, 0, 5, 23, 59))).toBe('huemi-field-2026-01-05.json.gz');
    expect(exportFileName(new Date(2026, 10, 30, 0, 1))).toBe('huemi-field-2026-11-30.json.gz');
  });
});

describe('exportFieldSet', () => {
  it('shares the file where the sheet takes it', async () => {
    const share = fakeSharePort();
    const outcome = await exportFieldSet({
      store: await seeded(),
      share,
      compress: identity,
      now: NOW,
    });

    expect(outcome).toBe('shared');
    expect(share.calls.download).toEqual([]);
    expect(share.calls.share).toHaveLength(1);
    const [data] = share.calls.share;
    expect(data!.title).toBe('huemi field set');
    const [file] = data!.files!;
    expect(file!.name).toBe('huemi-field-2026-10-06.json.gz');
    expect(file!.type).toBe('application/gzip');
  });

  it('passes on a dismissed sheet', async () => {
    const share = fakeSharePort({ share: () => Promise.resolve('dismissed') });
    const outcome = await exportFieldSet({ store: await seeded(), share, compress: identity });
    expect(outcome).toBe('dismissed');
    expect(share.calls.download).toEqual([]);
  });

  it('downloads it otherwise', async () => {
    const share = fakeSharePort({ canShareFiles: () => false });
    const outcome = await exportFieldSet({
      store: await seeded(),
      share,
      compress: identity,
      now: NOW,
    });

    expect(outcome).toBe('downloaded');
    expect(share.calls.share).toEqual([]);
    expect(share.calls.download.map((file) => [file.name, file.type])).toEqual([
      ['huemi-field-2026-10-06.json.gz', 'application/gzip'],
    ]);
  });

  it('reports a store failure', async () => {
    const share = fakeSharePort();
    const outcome = await exportFieldSet({
      store: fakeFieldStore({ failing: true }),
      share,
      compress: identity,
    });
    expect(outcome).toBe('failed');
    expect(share.calls.share).toEqual([]);
    expect(share.calls.download).toEqual([]);
  });

  it('reports a frame that cannot be read', async () => {
    const store = await seeded();
    store.readPixels = () => Promise.resolve({ ok: false, reason: 'test' });
    const share = fakeSharePort();
    expect(await exportFieldSet({ store, share, compress: identity })).toBe('failed');
    expect(share.calls.share).toEqual([]);
  });

  it('reports a compression failure', async () => {
    const share = fakeSharePort();
    const outcome = await exportFieldSet({
      store: await seeded(),
      share,
      compress: () => Promise.reject(new Error('test')),
    });
    expect(outcome).toBe('failed');
    expect(share.calls.share).toEqual([]);
    expect(share.calls.download).toEqual([]);
  });

  it("exports a capture's exact pixels", async () => {
    const store = await seeded();
    // A capture from normal use, with no garment, goes in too.
    await store.saveCapture(
      {
        ...CAPTURE,
        id: 'c2',
        source: 'flow',
        garmentId: null,
        settled: parseHex('#1f2a44'),
        lowLight: null,
        width: 1,
        height: 1,
      },
      { width: 1, height: 1, data: new Uint8ClampedArray([9, 8, 7, 255]) },
    );
    let compressed: Uint8Array<ArrayBuffer> | undefined;
    await exportFieldSet({
      store,
      share: fakeSharePort(),
      compress: (bytes) => {
        compressed = bytes;
        return Promise.resolve(bytes);
      },
      now: NOW,
    });

    const set = decodeFieldExport(new TextDecoder().decode(compressed));
    expect(set.exportedAt).toBe(NOW.toISOString());
    expect(set.garments).toEqual([GARMENT]);
    const byId = new Map(set.captures.map((capture) => [capture.id, capture]));
    expect(byId.get('c1')).toEqual({ ...CAPTURE, pixels: PIXELS });
    expect([...byId.get('c2')!.pixels.data]).toEqual([9, 8, 7, 255]);
    expect(byId.get('c2')!.lowLight).toBeNull();
  });
});
