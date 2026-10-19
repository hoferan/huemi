import { describe, expect, it } from 'vitest';
import { LOW_LIGHT } from '../../color/lightness';
import { initialLowLight, nextLowLight } from './lightness';

const DARK = LOW_LIGHT.darkBelow - 0.1;
const BRIGHT = LOW_LIGHT.darkBelow + LOW_LIGHT.margin + 0.1;
const IN_MARGIN = LOW_LIGHT.darkBelow + LOW_LIGHT.margin / 2;

function feed(samples: number[]) {
  return samples.reduce(nextLowLight, initialLowLight);
}

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
