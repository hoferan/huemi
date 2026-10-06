import { describe, expect, it } from 'vitest';
import { isHex, parseHex } from './hex';
import type { FieldCapture, FieldExport, FieldGarment } from './field';
import { decodeFieldExport, encodeFieldExport, mergeFieldExports } from './fieldExport';

const garment = (id: string, label: string): FieldGarment => ({
  id,
  label,
  truth: [parseHex('#336699')],
  createdAt: '2026-10-01T10:00:00.000Z',
});

const meta = (id: string): FieldCapture => ({
  id,
  source: 'kit',
  garmentId: 'g1',
  settled: parseHex('#336699'),
  light: 'daylight',
  lowLight: false,
  width: 3,
  height: 2,
  takenAt: '2026-10-01T10:05:00.000Z',
  build: 'abc1234',
});

type Wire = { captures: { pixels: { width: number } }[]; garments: { truth: string[] }[] };
const wire = (): Wire => JSON.parse(encodeFieldExport(file('2026-10-02T00:00:00.000Z'))) as Wire;

const bytes = (): Uint8ClampedArray =>
  Uint8ClampedArray.from({ length: 24 }, (_, i) => (i * 11) % 256);

const file = (exportedAt: string, over: Partial<FieldExport> = {}): FieldExport => ({
  version: 1,
  exportedAt,
  garments: [garment('g1', 'Blue shirt')],
  captures: [{ ...meta('c1'), pixels: { width: 3, height: 2, data: bytes() } }],
  ...over,
});

describe('field export', () => {
  it("round-trips a capture's pixels exactly", () => {
    const data = bytes();
    data[0] = 0;
    data[1] = 255;
    const input = file('2026-10-02T00:00:00.000Z', {
      captures: [{ ...meta('c1'), pixels: { width: 3, height: 2, data } }],
    });
    const out = decodeFieldExport(encodeFieldExport(input));
    const pixels = out.captures[0]?.pixels;
    expect(pixels?.width).toBe(3);
    expect(pixels?.height).toBe(2);
    expect(Array.from(pixels?.data ?? [])).toEqual(Array.from(data));
    expect(out.captures[0]).toMatchObject(meta('c1'));
  });

  it('rejects a file with another version', () => {
    const json = JSON.stringify({
      ...JSON.parse(encodeFieldExport(file('2026-10-02T00:00:00.000Z'))),
      version: 2,
    });
    expect(() => decodeFieldExport(json)).toThrow('Not a field export');
  });

  it('rejects text that is not JSON', () => {
    expect(() => decodeFieldExport('nope')).toThrow('Not a field export');
  });

  it('rejects a capture whose bytes do not match its size', () => {
    const parsed = wire();
    parsed.captures[0]!.pixels.width = 4;
    expect(() => decodeFieldExport(JSON.stringify(parsed))).toThrow('Not a field export');
  });

  it('rejects a bad hex and missing arrays', () => {
    const parsed = wire();
    parsed.garments[0]!.truth = ['red'];
    expect(() => decodeFieldExport(JSON.stringify(parsed))).toThrow('Not a field export');
    expect(() => decodeFieldExport('{"version":1}')).toThrow('Not a field export');
  });

  it('merges by id with the newer export winning', () => {
    const older = file('2026-10-01T00:00:00.000Z', { garments: [garment('g1', 'Old label')] });
    const newer = file('2026-10-03T00:00:00.000Z', {
      garments: [garment('g1', 'New label')],
      captures: [{ ...meta('c2'), pixels: { width: 3, height: 2, data: bytes() } }],
    });
    const merged = mergeFieldExports([newer, older]);
    expect(merged.exportedAt).toBe('2026-10-03T00:00:00.000Z');
    expect(merged.garments.map((g) => g.label)).toEqual(['New label']);
    expect(merged.captures.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('keeps truth and settled hexes as hexes', () => {
    const out = decodeFieldExport(encodeFieldExport(file('2026-10-02T00:00:00.000Z')));
    expect(isHex(out.garments[0]?.truth[0] ?? '')).toBe(true);
    expect(isHex(out.captures[0]?.settled ?? '')).toBe(true);
  });
});
