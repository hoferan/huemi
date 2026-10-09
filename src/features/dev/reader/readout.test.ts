import { describe, expect, it } from 'vitest';
import { READ_TUNING, colorsIn, defaultRegion, explain } from '../../../color/read';
import { NAVY, WHITE, paint, solid } from '../../../color/testing';
import type { Hex } from '../../../model/hex';
import { meanLightness } from '../../camera/lightness';
import { lightText, readout, ruleText, verdictText } from './readout';

describe('readout', () => {
  it('reads the region it is given', () => {
    const halves = paint(100, 100, (x) => (x < 50 ? NAVY : WHITE));
    const region = { cx: 20, cy: 50, r: 8 };
    const out = readout(halves, region);
    expect(out.found).toEqual(colorsIn(halves, region));
    expect(out.decision).toEqual(explain(out.found));
    expect(out.decision.reading.kind).toBe('single');
  });

  it('measures the mean lightness of the whole frame', () => {
    const pixels = solid(NAVY);
    expect(readout(pixels, defaultRegion(pixels)).lightness).toBe(meanLightness(pixels));
  });
});

describe('verdictText', () => {
  it('names a single color', () => {
    expect(verdictText({ kind: 'single', color: '#2b3a5c' as Hex })).toBe('single · Navy');
  });

  it('names each part of several, largest first', () => {
    expect(
      verdictText({
        kind: 'several',
        colors: [
          { color: '#2b3a5c' as Hex, share: 0.6 },
          { color: '#ecebe6' as Hex, share: 0.4 },
        ],
      }),
    ).toBe('several · Navy, Light grey');
  });

  it('says unclear alone', () => {
    expect(verdictText({ kind: 'unclear' })).toBe('unclear');
  });
});

describe('ruleText', () => {
  const { singleMin, partMin, coveredMin } = READ_TUNING;
  const unclear = { kind: 'unclear' } as const;

  it('says when nothing was sampled', () => {
    expect(ruleText({ reading: unclear, rule: 'nothing', largest: 0, parts: 0, covered: 0 })).toBe(
      'nothing sampled',
    );
  });

  it('puts the largest share against singleMin', () => {
    expect(
      ruleText({
        reading: { kind: 'single', color: '#2b3a5c' as Hex },
        rule: 'singleMin',
        largest: 0.823,
        parts: 1,
        covered: 0.823,
      }),
    ).toBe(`largest 0.82 ≥ single ${singleMin}`);
  });

  it('counts the parts against partMin', () => {
    expect(
      ruleText({ reading: unclear, rule: 'partMin', largest: 0.6, parts: 1, covered: 0.6 }),
    ).toBe(`largest 0.60 < single ${singleMin} · 1 part ≥ ${partMin}`);
  });

  it('counts no parts in the plural', () => {
    expect(
      ruleText({ reading: unclear, rule: 'partMin', largest: 0.12, parts: 0, covered: 0 }),
    ).toBe(`largest 0.12 < single ${singleMin} · 0 parts ≥ ${partMin}`);
  });

  it('puts what the parts cover against coveredMin, either way', () => {
    expect(
      ruleText({ reading: unclear, rule: 'coveredMin', largest: 0.4, parts: 3, covered: 0.8 }),
    ).toBe(`3 parts cover 0.80 < ${coveredMin}`);
    expect(
      ruleText({
        reading: { kind: 'several', colors: [] },
        rule: 'coveredMin',
        largest: 0.5,
        parts: 2,
        covered: 0.9,
      }),
    ).toBe(`2 parts cover 0.90 ≥ ${coveredMin}`);
  });
});

describe('lightText', () => {
  it('puts the mean lightness against the low-light line', () => {
    expect(lightText(0.412, true)).toBe('mean lightness 0.41 · dark below 0.25 · viewfinder dark');
    expect(lightText(0.412, false)).toBe(
      'mean lightness 0.41 · dark below 0.25 · viewfinder not dark',
    );
  });

  it('says a photo had no viewfinder', () => {
    expect(lightText(0.3, null)).toBe('mean lightness 0.30 · dark below 0.25 · uploaded photo');
  });
});
