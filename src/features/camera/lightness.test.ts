import { describe, expect, it } from 'vitest';
import type { Pixels } from '../../model/frame';
import { LOW_LIGHT, initialLowLight, meanLightness, nextLowLight } from './lightness';

function solid(value: number, side = 2): Pixels {
  const data = new Uint8ClampedArray(side * side * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  return { width: side, height: side, data };
}

const DARK = LOW_LIGHT.darkBelow - 0.1;
const BRIGHT = LOW_LIGHT.darkBelow + LOW_LIGHT.margin + 0.1;
const IN_MARGIN = LOW_LIGHT.darkBelow + LOW_LIGHT.margin / 2;

function feed(samples: number[]) {
  return samples.reduce(nextLowLight, initialLowLight);
}

describe('meanLightness', () => {
  it('reads black as 0 and white as 1', () => {
    expect(meanLightness(solid(0))).toBeCloseTo(0, 4);
    expect(meanLightness(solid(255))).toBeCloseTo(1, 4);
  });

  it('averages over every pixel', () => {
    const half = solid(0);
    half.data.set([255, 255, 255, 255], 0);
    half.data.set([255, 255, 255, 255], 4);
    expect(meanLightness(half)).toBeCloseTo(0.5, 4);
  });

  it('ignores alpha', () => {
    const clear = solid(255);
    for (let i = 3; i < clear.data.length; i += 4) clear.data[i] = 0;
    expect(meanLightness(clear)).toBeCloseTo(1, 4);
  });
});

describe('nextLowLight', () => {
  it('stays light after one dark sample', () => {
    expect(feed([DARK]).dark).toBe(false);
  });

  it('turns dark after two dark samples in a row', () => {
    expect(feed([DARK, DARK]).dark).toBe(true);
  });

  it('restarts the count when a light sample interrupts', () => {
    expect(feed([DARK, BRIGHT, DARK]).dark).toBe(false);
  });

  it('stays dark after one bright sample', () => {
    expect(feed([DARK, DARK, BRIGHT]).dark).toBe(true);
  });

  it('turns light again after two bright samples', () => {
    expect(feed([DARK, DARK, BRIGHT, BRIGHT]).dark).toBe(false);
  });

  it('stays dark inside the margin above the threshold', () => {
    expect(feed([DARK, DARK, IN_MARGIN, IN_MARGIN, IN_MARGIN]).dark).toBe(true);
  });

  it('leaves the state alone for a sample it cannot read', () => {
    const dark = feed([DARK, DARK]);
    expect(nextLowLight(dark, Number.NaN)).toBe(dark);
    expect(nextLowLight(initialLowLight, Number.NaN)).toBe(initialLowLight);
  });
});
