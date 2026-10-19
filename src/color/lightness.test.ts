import { describe, expect, it } from 'vitest';
import type { Pixels } from '../model/frame';
import { meanLightness } from './lightness';

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
