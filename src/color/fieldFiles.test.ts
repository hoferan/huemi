// @vitest-environment node
/// <reference types="node" />
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FieldExport } from '../model/field';
import { parseHex } from '../model/hex';
import { encodeFieldExport } from '../model/fieldExport';
import { loadFieldDir } from './fieldFiles';

const exportOf = (exportedAt: string, captureIds: string[]): FieldExport => ({
  version: 1,
  exportedAt,
  setId: 's1',
  garments: [
    { id: 'g1', label: 'Shirt', truth: [parseHex('#336699')], createdAt: '2026-10-01T10:00:00Z' },
  ],
  captures: captureIds.map((id) => ({
    id,
    source: 'kit',
    garmentId: 'g1',
    settled: null,
    light: 'daylight',
    lowLight: false,
    width: 1,
    height: 1,
    takenAt: '2026-10-01T10:05:00Z',
    build: 'abc1234',
    pixels: { width: 1, height: 1, data: Uint8ClampedArray.from([51, 102, 153, 255]) },
  })),
});

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'huemi-field-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const put = (name: string, data: FieldExport) =>
  writeFileSync(join(dir, name), gzipSync(encodeFieldExport(data)));

describe('loadFieldDir', () => {
  it('gives no data for a directory that does not exist', () => {
    expect(loadFieldDir(join(dir, 'missing'))).toEqual({ files: 0, data: null });
  });

  it('gives no data for a directory without exports, ignoring other files', () => {
    writeFileSync(join(dir, 'notes.txt'), 'hello');
    expect(loadFieldDir(dir)).toEqual({ files: 0, data: null });
  });

  it('merges every export, the newest snapshot of a set winning', () => {
    put('a.json.gz', exportOf('2026-10-02T00:00:00Z', ['c1', 'c2']));
    put('b.json.gz', exportOf('2026-10-03T00:00:00Z', ['c1']));
    const { files, data } = loadFieldDir(dir);
    expect(files).toBe(2);
    expect(data!.captures.map((c) => c.id)).toEqual(['c1']);
    expect([...data!.captures[0]!.pixels.data]).toEqual([51, 102, 153, 255]);
  });

  it('names the file that is not a field export', () => {
    writeFileSync(join(dir, 'broken.json.gz'), gzipSync('{"version":2}'));
    expect(() => loadFieldDir(dir)).toThrow(/broken\.json\.gz: Not a field export/);
  });
});
