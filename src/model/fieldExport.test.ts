import { describe, expect, it } from 'vitest';
import { isHex, parseHex } from './hex';
import type { FieldCapture, FieldExport, FieldGarment, PairVote } from './field';
import {
  decodeFieldExport,
  encodeFieldCapture,
  encodeFieldExport,
  mergeFieldExports,
} from './fieldExport';

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

type Wire = {
  setId?: unknown;
  captures: { light: string; verdict?: string; pixels: { width: number; data: string } }[];
  garments: { truth: string[] }[];
  votes: { offered: string[] }[];
};
const wire = (): Wire => JSON.parse(encodeFieldExport(file('2026-10-02T00:00:00.000Z'))) as Wire;
const rejects = (parsed: Wire) =>
  expect(() => decodeFieldExport(JSON.stringify(parsed))).toThrow('Not a field export');

const bytes = (): Uint8ClampedArray =>
  Uint8ClampedArray.from({ length: 24 }, (_, i) => (i * 11) % 256);

const shot = (id: string, over: Partial<FieldCapture> = {}) => ({
  ...meta(id),
  ...over,
  pixels: { width: 3, height: 2, data: bytes() },
});

const vote = (id: string, over: Partial<PairVote> = {}): PairVote => ({
  id,
  takenAt: '2026-10-01T10:06:00.000Z',
  build: 'abc1234',
  top: parseHex('#336699'),
  bottom: parseHex('#996633'),
  liked: true,
  changed: null,
  replacement: null,
  offered: [],
  noneWorks: false,
  ...over,
});

const file = (exportedAt: string, over: Partial<FieldExport> = {}): FieldExport => ({
  version: 2,
  exportedAt,
  setId: 'phone',
  garments: [garment('g1', 'Blue shirt')],
  votes: [],
  captures: [shot('c1')],
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
    expect(out.setId).toBe('phone');
  });

  // Large enough that base64 goes through more than one 0x8000-byte chunk,
  // and patterned so a chunk dropped, doubled or reordered would show.
  it('round-trips a frame larger than one base64 chunk', () => {
    const width = 200;
    const height = 200;
    const data = Uint8ClampedArray.from(
      { length: width * height * 4 },
      (_, i) => (i * 7 + (i >> 9)) % 256,
    );
    const input = file('2026-10-02T00:00:00.000Z', {
      captures: [{ ...meta('c1'), width, height, pixels: { width, height, data } }],
    });
    const out = decodeFieldExport(encodeFieldExport(input)).captures[0]!.pixels;
    expect(out.data.length).toBe(width * height * 4);
    expect(out.data).toEqual(data);
  });

  it('writes a capture the same way on its own as inside the set', () => {
    const one = shot('c1');
    expect(encodeFieldExport(file('2026-10-02T00:00:00.000Z', { captures: [one] }))).toContain(
      encodeFieldCapture(one),
    );
  });

  it('rejects a file with another version', () => {
    const json = JSON.stringify({
      ...JSON.parse(encodeFieldExport(file('2026-10-02T00:00:00.000Z'))),
      version: 3,
    });
    expect(() => decodeFieldExport(json)).toThrow('Not a field export');
  });

  it('rejects text that is not JSON', () => {
    expect(() => decodeFieldExport('nope')).toThrow('Not a field export');
  });

  it('rejects a file without the id of the set it came from', () => {
    const parsed = wire();
    delete parsed.setId;
    rejects(parsed);
    parsed.setId = 7;
    rejects(parsed);
  });

  it('rejects a capture whose bytes do not match its size', () => {
    const parsed = wire();
    parsed.captures[0]!.pixels.width = 4;
    rejects(parsed);
  });

  it('rejects a bad hex and missing arrays', () => {
    const parsed = wire();
    parsed.garments[0]!.truth = ['red'];
    rejects(parsed);
    expect(() => decodeFieldExport('{"version":1}')).toThrow('Not a field export');
  });

  it('rejects a light it does not know', () => {
    const parsed = wire();
    parsed.captures[0]!.light = 'moon';
    rejects(parsed);
  });

  it('rejects pixels that are not base64', () => {
    const parsed = wire();
    parsed.captures[0]!.pixels.data = '%%%not base64%%%';
    rejects(parsed);
  });

  it('rejects a garment with no true color or more than three', () => {
    const none = wire();
    none.garments[0]!.truth = [];
    rejects(none);
    const four = wire();
    four.garments[0]!.truth = ['#111111', '#222222', '#333333', '#444444'];
    rejects(four);
    const three = wire();
    three.garments[0]!.truth = ['#111111', '#222222', '#333333'];
    expect(decodeFieldExport(JSON.stringify(three)).garments[0]!.truth).toHaveLength(3);
  });

  it('decodes a version 1 file as version 2 with no votes', () => {
    const parsed: Record<string, unknown> = {
      ...wire(),
      version: 1,
    };
    delete parsed.votes;
    const out = decodeFieldExport(JSON.stringify(parsed));
    expect(out.version).toBe(2);
    expect(out.votes).toEqual([]);
    expect(out.captures.map((c) => c.id)).toEqual(['c1']);
  });

  it('round-trips a run capture with its verdict', () => {
    const input = file('2026-10-02T00:00:00.000Z', {
      captures: [shot('c1', { source: 'run', settled: null, verdict: 'missed' })],
    });
    const out = decodeFieldExport(encodeFieldExport(input));
    expect(out.captures[0]).toMatchObject({ source: 'run', settled: null, verdict: 'missed' });
  });

  it('leaves the verdict off a capture that has none', () => {
    const out = decodeFieldExport(encodeFieldExport(file('2026-10-02T00:00:00.000Z')));
    expect('verdict' in out.captures[0]!).toBe(false);
  });

  it('round-trips a pair vote', () => {
    const v = vote('v1', {
      liked: false,
      changed: 'bottom',
      replacement: parseHex('#c7894f'),
      offered: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'].map(parseHex),
      noneWorks: false,
    });
    const out = decodeFieldExport(
      encodeFieldExport(file('2026-10-02T00:00:00.000Z', { votes: [v] })),
    );
    expect(out.votes).toEqual([v]);
  });

  it('writes the keys in the order the streamed export uses', () => {
    const keys = Object.keys(wire());
    expect(keys).toEqual(['version', 'exportedAt', 'setId', 'garments', 'votes', 'captures']);
  });

  it('rejects a run capture with an unknown verdict', () => {
    const parsed = wire();
    parsed.captures[0]!.verdict = 'maybe';
    rejects(parsed);
  });

  it('rejects a vote with a bad hex in offered', () => {
    const parsed = JSON.parse(
      encodeFieldExport(file('2026-10-02T00:00:00.000Z', { votes: [vote('v1')] })),
    ) as Wire;
    parsed.votes[0]!.offered = ['red'];
    rejects(parsed);
  });

  it('keeps truth and settled hexes as hexes', () => {
    const out = decodeFieldExport(encodeFieldExport(file('2026-10-02T00:00:00.000Z')));
    expect(isHex(out.garments[0]?.truth[0] ?? '')).toBe(true);
    expect(isHex(out.captures[0]?.settled ?? '')).toBe(true);
  });
});

describe('mergeFieldExports', () => {
  it('a deletion on the phone stays deleted after merging an older export of the same set', () => {
    const older = file('2026-10-01T00:00:00.000Z', {
      garments: [garment('g1', 'Blue shirt'), garment('g2', 'Gone')],
      captures: [shot('c1'), shot('c2')],
    });
    // c2 and g2 were deleted on the phone between the two exports.
    const newer = file('2026-10-03T00:00:00.000Z');
    const merged = mergeFieldExports([newer, older]);
    expect(merged.exportedAt).toBe('2026-10-03T00:00:00.000Z');
    expect(merged.garments.map((g) => g.id)).toEqual(['g1']);
    expect(merged.captures.map((c) => c.id)).toEqual(['c1']);
  });

  it('two sets union', () => {
    const phone = file('2026-10-01T00:00:00.000Z', {
      setId: 'phone',
      garments: [garment('g1', 'Blue shirt')],
      captures: [shot('c1')],
    });
    const tablet = file('2026-10-02T00:00:00.000Z', {
      setId: 'tablet',
      garments: [garment('g2', 'Red scarf')],
      captures: [shot('c2', { garmentId: 'g2' })],
    });
    const merged = mergeFieldExports([tablet, phone]);
    expect(merged.garments.map((g) => g.id).sort()).toEqual(['g1', 'g2']);
    expect(merged.captures.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    expect(merged.exportedAt).toBe('2026-10-02T00:00:00.000Z');
  });

  it('lets the newest export win an id both sets hold', () => {
    const phone = file('2026-10-01T00:00:00.000Z', {
      setId: 'phone',
      garments: [garment('g1', 'Old label')],
      captures: [shot('c1', { light: 'dim' })],
    });
    const tablet = file('2026-10-03T00:00:00.000Z', {
      setId: 'tablet',
      garments: [garment('g1', 'New label')],
      captures: [shot('c1', { light: 'lamp' })],
    });
    const merged = mergeFieldExports([tablet, phone]);
    expect(merged.garments.map((g) => g.label)).toEqual(['New label']);
    expect(merged.captures.map((c) => [c.id, c.light])).toEqual([['c1', 'lamp']]);
  });

  it('merges votes by id, newest export of each set winning', () => {
    const older = file('2026-10-01T00:00:00.000Z', { votes: [vote('a'), vote('b')] });
    const newer = file('2026-10-03T00:00:00.000Z', { votes: [vote('b', { liked: false })] });
    const merged = mergeFieldExports([newer, older]);
    expect(merged.version).toBe(2);
    expect(merged.votes.map((v) => [v.id, v.liked])).toEqual([['b', false]]);

    const tablet = file('2026-10-02T00:00:00.000Z', { setId: 'tablet', votes: [vote('c')] });
    const union = mergeFieldExports([tablet, older]);
    expect(union.votes.map((v) => v.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('names the sets it came from', () => {
    const merged = mergeFieldExports([
      file('2026-10-02T00:00:00.000Z', { setId: 'tablet' }),
      file('2026-10-01T00:00:00.000Z', { setId: 'phone' }),
      file('2026-10-03T00:00:00.000Z', { setId: 'phone' }),
    ]);
    expect(merged.setId).toBe('phone+tablet');
    expect(mergeFieldExports([file('2026-10-01T00:00:00.000Z')]).setId).toBe('phone');
  });
});
