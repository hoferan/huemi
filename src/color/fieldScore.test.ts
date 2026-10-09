import { describe, expect, it } from 'vitest';
import type { FieldCapture, FieldExport, FieldGarment } from '../model/field';
import type { Pixels } from '../model/frame';
import type { Hex } from '../model/hex';
import { rgbToHex } from './convert';
import { WRONG_AT, scoreFieldSet } from './fieldScore';
import { oklabDistance } from './oklab';
import { colorsIn } from './read';
import { NAVY, RUST, WHITE, busy, paint, solid } from './testing';

const navy = rgbToHex(NAVY);
const white = rgbToHex(WHITE);
const rust = rgbToHex(RUST);

const stripes = () => paint(100, 100, (_, y) => (y % 10 < 6 ? NAVY : WHITE));

const garment = (id: string, truth: Hex[]): FieldGarment => ({
  id,
  label: `Garment ${id}`,
  truth,
  createdAt: '2026-10-01T10:00:00.000Z',
});

const capture = (
  pixels: Pixels,
  over: Partial<FieldCapture> = {},
): FieldExport['captures'][number] => ({
  id: 'c1',
  source: 'kit',
  garmentId: 'g1',
  settled: null,
  light: 'daylight',
  lowLight: false,
  width: pixels.width,
  height: pixels.height,
  takenAt: '2026-10-01T10:05:00.000Z',
  build: 'abc1234',
  ...over,
  pixels,
});

const set = (garments: FieldGarment[], captures: FieldExport['captures']): FieldExport => ({
  version: 1,
  exportedAt: '2026-10-02T00:00:00.000Z',
  setId: 's1',
  garments,
  captures,
});

// The one score a single-capture set produces.
const only = (truth: Hex[], pixels: Pixels, over: Partial<FieldCapture> = {}) => {
  const { scores, skipped } = scoreFieldSet(set([garment('g1', truth)], [capture(pixels, over)]));
  expect(skipped).toBe(0);
  expect(scores).toHaveLength(1);
  return scores[0]!;
};

describe('scoreFieldSet', () => {
  it('scores a plain garment read as one color against its truth', () => {
    const score = only([navy], solid(NAVY));
    expect(score.reading.kind).toBe('single');
    expect(score.distance).toBeLessThan(0.01);
    expect(score.verdictRight).toBe(true);
    expect(score.source).toBe('garment');
    expect(score.label).toBe('Garment g1');
    expect(score.truth).toEqual([navy]);
    expect(score.light).toBe('daylight');
    expect([score.width, score.height]).toEqual([100, 100]);
  });

  it('scores a two-color garment read as several', () => {
    const score = only([navy, white], stripes());
    expect(score.reading.kind).toBe('several');
    expect(score.scored).toHaveLength(2);
    expect(score.verdictRight).toBe(true);
    expect(score.distance).toBeLessThan(0.02);
  });

  it('counts the worst-matched part of a several reading', () => {
    const score = only([navy], stripes());
    expect(score.verdictRight).toBe(false);
    const whitePart = score.scored.find((c) => oklabDistance(c, white) < 0.02)!;
    expect(score.distance).toBeCloseTo(oklabDistance(whitePart, navy), 6);
    expect(score.distance).toBeGreaterThan(WRONG_AT);
  });

  it('takes a three-color garment read as two parts as the right verdict', () => {
    const score = only([navy, white, rust], stripes());
    expect(score.reading.kind).toBe('several');
    expect(score.verdictRight).toBe(true);
  });

  it('measures a multicolor garment read as one color against the nearest truth', () => {
    const score = only([navy, rust], solid(NAVY));
    expect(score.reading.kind).toBe('single');
    expect(score.verdictRight).toBe(false);
    expect(score.distance).toBeLessThan(0.01);
  });

  it('scores an unclear reading by the largest color it found', () => {
    const frame = paint(100, 100, busy);
    const score = only([navy], frame);
    expect(score.reading.kind).toBe('unclear');
    expect(score.verdictRight).toBe(false);
    expect(score.scored).toEqual([colorsIn(frame)[0]!.color]);
    expect(score.distance).toBeCloseTo(oklabDistance(score.scored[0]!, navy), 6);
  });

  it('scores a flow capture linked to a garment against the garment, not what was settled', () => {
    const score = only([navy], solid(NAVY), { source: 'flow', settled: rust });
    expect(score.source).toBe('garment');
    expect(score.truth).toEqual([navy]);
  });

  it('scores an unlinked flow capture against the color settled in use', () => {
    const { scores } = scoreFieldSet(
      set([], [capture(solid(NAVY), { source: 'flow', garmentId: null, settled: navy })]),
    );
    expect(scores[0]!.source).toBe('settled');
    expect(scores[0]!.truth).toEqual([navy]);
    expect(scores[0]!.label).toBeNull();
  });

  it('skips a capture whose garment is gone, and one with no truth at all', () => {
    const { scores, skipped } = scoreFieldSet(
      set(
        [],
        [
          capture(solid(NAVY), { id: 'c1', garmentId: 'gone' }),
          capture(solid(NAVY), { id: 'c2', source: 'flow', garmentId: null, settled: null }),
        ],
      ),
    );
    expect(scores).toEqual([]);
    expect(skipped).toBe(2);
  });
});
